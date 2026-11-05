// Ported from upstream's src/test/frontmatter.test.tsx.
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { CORE_SCHEMA, load } from 'js-yaml';
import type { Component } from 'svelte';
import {
	frontmatterPlugin,
	toolbarPlugin,
	type MarkdownEditorMethods,
	type Translation
} from '#lib';
import ToolbarEditor from '../fixtures/ToolbarEditor.svelte';
import OpenFrontmatter from '../fixtures/OpenFrontmatter.svelte';
import CustomFrontmatter from '../fixtures/CustomFrontmatter.svelte';
import OtherFrontmatter from '../fixtures/OtherFrontmatter.svelte';
import RetainingFrontmatter, { retained } from '../fixtures/RetainingFrontmatter.svelte';
import { expectSoon, setValue } from '../dom.js';

interface SetupOptions {
	readonly?: boolean;
	translation?: Translation;
	FrontmatterEditor?: Component<never>;
}

async function setup(yaml: string, options: SetupOptions = {}) {
	const onchange = vi.fn();
	const props = $state({
		markdown: `---\n${yaml}\n---\n\nBody`,
		plugins: [
			frontmatterPlugin(
				options.FrontmatterEditor
					? { FrontmatterEditor: options.FrontmatterEditor as never }
					: undefined
			)
		],
		toolbar: OpenFrontmatter as Component,
		onchange,
		readonly: options.readonly ?? false,
		translation: options.translation,
		editor: undefined as MarkdownEditorMethods | undefined
	});
	const view = await render(ToolbarEditor, props);
	await expectSoon(() => props.editor !== undefined);
	return {
		...view,
		props,
		onchange,
		markdown: () => props.editor!.getMarkdown()
	};
}

const byRole = (role: Parameters<typeof page.getByRole>[0], name?: string) =>
	page.getByRole(role, name ? { name, exact: true } : undefined);

async function open() {
	(byRole('button', 'Open frontmatter').element() as HTMLElement).click();
	await expect.element(byRole('dialog')).toBeInTheDocument();
	return byRole('dialog').element() as HTMLElement;
}

function keyInputs(): HTMLInputElement[] {
	return Array.from(document.querySelectorAll<HTMLInputElement>('input[aria-label="Key"]'));
}

function valueField(key: string): HTMLInputElement {
	const row = keyInputs()
		.find((input) => input.value === key)!
		.closest('tr')!;
	return row.querySelector<HTMLInputElement>('input[aria-label="Value"]')!;
}

function button(name: string): HTMLButtonElement {
	// The dialog has two Cancel buttons, like upstream's; it uses the first one too.
	return byRole('button', name).first().element() as HTMLButtonElement;
}

async function save() {
	button('Save').click();
	await expect.element(byRole('dialog')).not.toBeInTheDocument();
}

function parse(markdown: string) {
	return load(markdown.split('---')[1], { schema: CORE_SCHEMA });
}

describe('default frontmatter key-value form', () => {
	it('preserves falsy values, date strings and structured fields while editing another field', async () => {
		const editor = await setup(
			'title: original\nflag: false\ncount: 0\nempty: ""\nnothing: null\ndate: 2026-10-27\ncover: {src: /old.png}\nitems: [false, 0]'
		);
		const dialog = await open();
		expect(dialog.querySelector('table')).not.toBeNull();
		expect(dialog.querySelector('[role="combobox"]')).toBeNull();
		expect(dialog.querySelector('textarea')).toBeNull();
		expect(valueField('cover').hasAttribute('readonly')).toBe(true);
		setValue(valueField('title'), 'changed');
		await save();
		expect(parse(editor.markdown())).toEqual({
			title: 'changed',
			flag: false,
			count: 0,
			empty: '',
			nothing: null,
			date: '2026-10-27',
			cover: { src: '/old.png' },
			items: [false, 0]
		});
		expect(editor.markdown()).not.toContain('T00:00:00');
	});

	it.each([
		'# keep this comment\ntitle: \'original\'\nflag: false\ncount: 0\nempty: ""',
		'{}',
		'cover: {src: /old.png}\nitems: [false, 0]',
		'# preserve anchors too\ncover: &cover {src: /old.png}\ncopy: *cover'
	])('skips the write on an unchanged save: %s', async (yaml) => {
		const editor = await setup(yaml);
		const before = editor.markdown();
		await open();
		editor.onchange.mockClear();
		await save();
		expect(editor.markdown()).toBe(before);
		expect(editor.onchange).not.toHaveBeenCalled();
	});

	it('keeps original bytes after editing then reverting string, false, zero and empty fields', async () => {
		const editor = await setup(
			'# comment\ntitle: \'original\'\nflag: false\ncount: 0\nempty: ""\ndate: 2026-10-27'
		);
		const before = editor.markdown();
		await open();
		for (const [key, value] of [
			['title', 'original'],
			['flag', 'false'],
			['count', '0'],
			['empty', ''],
			['date', '2026-10-27']
		]) {
			setValue(valueField(key), 'temporary');
			setValue(valueField(key), value);
		}
		editor.onchange.mockClear();
		await save();
		expect(editor.markdown()).toBe(before);
		expect(editor.onchange).not.toHaveBeenCalled();
	});

	it('saves an empty string in an edited field and a newly added field', async () => {
		const editor = await setup('title: original');
		await open();
		setValue(valueField('title'), '');
		button('Add entry').click();
		await expectSoon(() => keyInputs().length === 2);
		setValue(keyInputs()[1], 'new');
		await save();
		expect(parse(editor.markdown())).toEqual({ title: '', new: '' });
	});

	it.each([
		['flag', 'false', 'false'],
		['count', '0', '0'],
		['nothing', 'null', '']
	])(
		'preserves the original %s baseline across adding and removing a row',
		async (key, yamlValue, inputValue) => {
			const editor = await setup(`# retain comment and formatting\n${key}: ${yamlValue}`);
			const before = editor.markdown();
			await open();
			setValue(valueField(key), 'temporary');
			button('Add entry').click();
			await expectSoon(() => keyInputs().length === 2);
			keyInputs()[1].closest('tr')!.querySelector('button')!.click();
			await expectSoon(() => keyInputs().length === 1);
			setValue(valueField(key), inputValue);
			editor.onchange.mockClear();
			await save();
			expect(editor.markdown()).toBe(before);
			expect(editor.onchange).not.toHaveBeenCalled();
		}
	);

	it('keeps row baselines attached to their identities after earlier removal, renaming and insertion', async () => {
		const editor = await setup('before: remove me\nflag: false\ncount: 0\nnothing: null');
		await open();
		for (const key of ['flag', 'count', 'nothing']) setValue(valueField(key), 'temporary');
		const flagKey = valueField('flag').closest('tr')!.querySelector<HTMLInputElement>('input')!;
		setValue(flagKey, 'renamed');
		valueField('before').closest('tr')!.querySelector('button')!.click();
		button('Add entry').click();
		await expectSoon(() => keyInputs().length === 4);
		setValue(keyInputs().at(-1)!, 'flag');
		setValue(valueField('flag'), 'false');
		for (const [key, value] of [
			['renamed', 'false'],
			['count', '0'],
			['nothing', '']
		]) {
			setValue(valueField(key), value);
		}
		await save();
		expect(parse(editor.markdown())).toEqual({
			renamed: false,
			count: 0,
			nothing: null,
			flag: 'false'
		});
	});

	it('discards canceled edits and loads external changes when reopened', async () => {
		const editor = await setup('title: original');
		await open();
		setValue(valueField('title'), 'discarded');
		button('Cancel').click();
		await expect.element(byRole('dialog')).not.toBeInTheDocument();
		await open();
		expect(valueField('title').value).toBe('original');
		button('Cancel').click();
		await expect.element(byRole('dialog')).not.toBeInTheDocument();
		editor.props.editor!.setMarkdown('---\ntitle: external\n---\n\nBody');
		await open();
		await expectSoon(() => valueField('title')?.value === 'external');
	});

	it('removes frontmatter only after all rows are explicitly deleted and saved', async () => {
		const editor = await setup('title: original');
		const dialog = await open();
		dialog.querySelector<HTMLButtonElement>('tbody button')!.click();
		await save();
		await expectSoon(() => editor.markdown() === 'Body');
	});

	it('disables saving and row changes in read-only mode', async () => {
		const editor = await setup('title: original', { readonly: true });
		const before = editor.markdown();
		const dialog = await open();
		expect(valueField('title').hasAttribute('readonly')).toBe(true);
		expect(button('Save').disabled).toBe(true);
		expect(button('Add entry').disabled).toBe(true);
		expect(dialog.querySelector<HTMLButtonElement>('tbody button')!.disabled).toBe(true);
		dialog.querySelector('form')!.requestSubmit();
		expect(editor.markdown()).toBe(before);
	});

	it.each([
		'cover: [',
		'scalar',
		'[one, two]',
		'null',
		'id: 9223372036854775807',
		'# only a comment',
		'recursive: &loop [*loop]'
	])('keeps unsupported source intact instead of offering a lossy/raw form: %s', async (yaml) => {
		const editor = await setup(yaml);
		const before = editor.markdown();
		const dialog = await open();
		await expect.element(byRole('alert')).toHaveTextContent('Edit the Markdown source instead.');
		expect(button('Save').disabled).toBe(true);
		expect(button('Add entry').disabled).toBe(true);
		expect(dialog.querySelector('textarea')).toBeNull();
		dialog.querySelector('form')!.requestSubmit();
		expect(editor.markdown()).toBe(before);
		button('Cancel').click();
		expect(editor.markdown()).toBe(before);
	});

	it('keeps multiline strings intact when they are focused and another field is saved', async () => {
		const editor = await setup('title: original\nbody: |-\n  first\n  second\nkeep: |+\n  foo\n\n');
		await open();
		expect(valueField('body').hasAttribute('readonly')).toBe(true);
		valueField('body').focus();
		valueField('body').blur();
		setValue(valueField('title'), 'changed');
		await save();
		expect(parse(editor.markdown())).toEqual({
			title: 'changed',
			body: 'first\nsecond',
			keep: 'foo\n\n'
		});
	});

	it('uses the translation callback for the controlled invalid-source message', async () => {
		const translation = vi.fn((key: string, fallback: string) =>
			key === 'frontmatterEditor.invalidYaml' ? '请在 Markdown 源码中修改前置元数据。' : fallback
		);
		await setup('cover: [', { translation });
		await open();
		await expect.element(byRole('alert')).toHaveTextContent('请在 Markdown 源码中修改前置元数据。');
		await expect.element(byRole('alert')).not.toHaveTextContent('YAMLException');
	});
});

describe('frontmatter editor component extension', () => {
	it('passes delimiter-free current YAML and commits onChange from a custom component', async () => {
		const editor = await setup('title: original', {
			FrontmatterEditor: CustomFrontmatter as Component<never>
		});
		await expect.element(byRole('button', 'Custom: title: original')).toBeInTheDocument();
		button('Custom: title: original').click();
		await expectSoon(() => editor.markdown() === '---\ntitle: custom\n---\n\nBody');
		await expect.element(byRole('button', 'Custom: title: custom')).toBeInTheDocument();
		editor.props.editor!.setMarkdown('---\ntitle: external\n---\n\nBody');
		await expect.element(byRole('button', 'Custom: title: external')).toBeInTheDocument();
	});

	it('updates existing nodes when the option changes and restores the default when omitted', async () => {
		const editor = await setup('title: original', {
			FrontmatterEditor: CustomFrontmatter as Component<never>
		});
		await expect.element(byRole('button', 'Custom: title: original')).toBeInTheDocument();
		editor.props.plugins = [frontmatterPlugin({ FrontmatterEditor: OtherFrontmatter })];
		await expect
			.element(page.getByLabelText('Other frontmatter'))
			.toHaveTextContent('title: original');
		expect(document.body.textContent).not.toContain('Custom:');
		editor.props.plugins = [frontmatterPlugin()];
		await expect.element(page.getByLabelText('Other frontmatter')).not.toBeInTheDocument();
		await open();
		expect(valueField('title').value).toBe('original');
	});

	it('applies repeated changes from a retained custom editor callback', async () => {
		retained.onChange = null;
		const editor = await setup('title: original', {
			FrontmatterEditor: RetainingFrontmatter as Component<never>
		});
		await expectSoon(() => retained.onChange !== null);
		retained.onChange!('title: changed');
		await expectSoon(() => editor.markdown() === '---\ntitle: changed\n---\n\nBody');
		retained.onChange!('title: original');
		await expectSoon(() => editor.markdown() === '---\ntitle: original\n---\n\nBody');
		expect(editor.markdown()).toBe('---\ntitle: original\n---\n\nBody');
	});

	it('does not allow a custom component to change a read-only document', async () => {
		const editor = await setup('title: original', {
			readonly: true,
			FrontmatterEditor: CustomFrontmatter as Component<never>
		});
		const before = editor.markdown();
		await expect.element(byRole('button', 'Custom: title: original')).toBeInTheDocument();
		button('Custom: title: original').click();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(editor.markdown()).toBe(before);
	});
});

// The toolbar plugin is only needed for the trigger button.
void toolbarPlugin;
