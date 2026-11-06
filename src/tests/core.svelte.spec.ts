import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import { MarkdownEditor, rootEditor$, type RealmPlugin } from '#lib';
import type { Realm } from '#lib';
// Svelte modules reserve the `$` prefix, so Lexical's `$` functions are used through the namespace.
import * as lexical from 'lexical';

const content = () => page.getByRole('textbox', { name: 'editable markdown' });

async function roundTrip(markdown: string) {
	const { component } = await render(MarkdownEditor, { markdown });
	return component.getMarkdown().trim();
}

async function testIdenticalMarkdown(markdown: string) {
	expect(await roundTrip(markdown)).toEqual(markdown.trim());
}

// Ported from upstream's src/test/core.test.tsx. Cases that need plugins move with those plugins.
describe('markdown import export', () => {
	it('works with an empty string', () => testIdenticalMarkdown(''));
	it('works with a simple paragraph', () => testIdenticalMarkdown('Hello World'));
	it('works with a line break', () => testIdenticalMarkdown('Hello\nWorld'));
	it('works with two paragraphs', () => testIdenticalMarkdown('Hello\n\nWorld'));
	it('works with italics', () => testIdenticalMarkdown('*Hello* World'));
	it('works with strong', () => testIdenticalMarkdown('**Hello** World'));
	it('works with underline', () => testIdenticalMarkdown('<u>Hello</u> World'));
	it('works with code', () => testIdenticalMarkdown('`Hello` World'));
	it('works with code in strong', () => testIdenticalMarkdown('**`Hello` World**'));
	it('works with strikethrough', () => testIdenticalMarkdown('~~Hello~~ World'));
	it('works with highlight', () => testIdenticalMarkdown('==Hello== World'));
	it('works with superscript', () => testIdenticalMarkdown('<sup>Hello</sup> World'));
	it('works with subscript', () => testIdenticalMarkdown('<sub>Hello</sub> World'));

	it('exports consecutive line breaks as a paragraph break', async () => {
		expect(await roundTrip('a\\\n\\\nb')).toEqual('a\n\nb');
	});

	it('keeps leading whitespace of the paragraph that follows consecutive line breaks', async () => {
		expect(await roundTrip('a\\\n\\\n&#x20;b')).toEqual('a\n\n&#x20;b');
	});

	it('keeps html elements, with their attributes', () =>
		testIdenticalMarkdown('<div class="a">Hello</div>'));

	it('ignores a closing format tag without an opening one', async () => {
		const markdown = await roundTrip('a</u>b');
		expect(markdown).not.toContain('<u>');
	});

	it('drops html comments without failing', async () => {
		const onerror = vi.fn();
		await render(MarkdownEditor, { markdown: 'a <!-- hidden --> b', onerror });
		expect(onerror).not.toHaveBeenCalled();
	});
});

describe('MarkdownEditor', () => {
	it('renders the markdown as rich text', async () => {
		await render(MarkdownEditor, { markdown: '**bold** text' });
		await expect.element(content()).toHaveTextContent('bold text');
		expect(content().element().querySelector('strong')).not.toBeNull();
	});

	it('reports edits through onchange and bind:markdown', async () => {
		const onchange = vi.fn();
		const { component } = await render(MarkdownEditor, { markdown: 'abc', onchange });
		await userEvent.click(content());
		await userEvent.keyboard('{End}!');
		await vi.waitFor(() => expect(onchange).toHaveBeenLastCalledWith('abc!', false));
		expect(component.getMarkdown()).toBe('abc!');
	});

	it('reports normalization of the initial markdown', async () => {
		const onchange = vi.fn();
		await render(MarkdownEditor, { markdown: 'a  \nb\n\n\n\nc', onchange });
		await vi.waitFor(() => expect(onchange).toHaveBeenCalled());
		expect(onchange.mock.calls[0][1]).toBe(true);
	});

	it('applies external markdown prop changes without echoing them', async () => {
		const onchange = vi.fn();
		const { rerender } = await render(MarkdownEditor, { markdown: 'one', onchange });
		await rerender({ markdown: 'two' });
		await expect.element(content()).toHaveTextContent('two');
		await tick();
		expect(onchange).not.toHaveBeenCalled();
	});

	it('supports setMarkdown and insertMarkdown', async () => {
		const { component } = await render(MarkdownEditor, { markdown: 'one' });
		component.setMarkdown('**two**');
		await expect.element(content()).toHaveTextContent('two');
		await userEvent.click(content());
		await userEvent.keyboard('{End}');
		component.insertMarkdown('*three*');
		await expect.element(content()).toHaveTextContent('twothree');
		await vi.waitFor(() => expect(component.getMarkdown().trim()).toBe('**two***three*'));
	});

	it('keeps bind:markdown in step with setMarkdown', async () => {
		const onchange = vi.fn();
		const props = $state({ markdown: 'one', onchange });
		const { component } = await render(MarkdownEditor, props);
		component.setMarkdown('two');
		await expect.element(content()).toHaveTextContent('two');
		expect(props.markdown).toBe('two');
		await tick();
		expect(onchange).not.toHaveBeenCalled();
	});

	it('starts from the editorState prop instead of the markdown', async () => {
		const source = lexical.createEditor({
			onError: (error) => {
				throw error;
			}
		});
		source.update(
			() => {
				const paragraph = lexical.$createParagraphNode();
				paragraph.append(lexical.$createTextNode('from state'));
				lexical.$getRoot().append(paragraph);
			},
			{ discrete: true }
		);
		const { component } = await render(MarkdownEditor, {
			markdown: 'from markdown',
			editorState: source.getEditorState()
		});
		await expect.element(content()).toHaveTextContent('from state');
		expect(component.getMarkdown().trim()).toBe('from state');
	});

	it('returns html and the markdown of the selection', async () => {
		const { component } = await render(MarkdownEditor, { markdown: '**bold** rest' });
		await vi.waitFor(() => expect(component.getContentEditableHTML()).toContain('<strong'));
		expect(component.getSelectionMarkdown()).toBe('');
		await userEvent.click(content());
		await userEvent.keyboard('{Control>}a{/Control}{Meta>}a{/Meta}');
		await vi.waitFor(() => expect(component.getSelectionMarkdown()).toBe('**bold** rest'));
	});

	it('reports parse errors through onerror and keeps the source', async () => {
		const onerror = vi.fn();
		const { component } = await render(MarkdownEditor, {
			markdown: 'broken <div',
			onerror
		});
		await vi.waitFor(() => expect(onerror).toHaveBeenCalled());
		expect(onerror.mock.calls[0][0].source).toBe('broken <div');
		expect(component.getMarkdown()).toBe('broken <div');
	});

	it('does not parse html with suppressHtmlProcessing', async () => {
		const onerror = vi.fn();
		await render(MarkdownEditor, {
			markdown: 'not broken <div',
			suppressHtmlProcessing: true,
			onerror
		});
		await expect.element(content()).toHaveTextContent('not broken <div');
		expect(onerror).not.toHaveBeenCalled();
	});

	it('shows the placeholder only while empty', async () => {
		await render(MarkdownEditor, { markdown: '', placeholder: 'Type here' });
		await expect.element(page.getByText('Type here')).toBeVisible();
		await userEvent.click(content());
		await userEvent.keyboard('x');
		await expect.element(page.getByText('Type here')).not.toBeInTheDocument();
	});

	it('toggles read-only mode', async () => {
		const { rerender } = await render(MarkdownEditor, { markdown: 'text', readonly: true });
		expect(content().element().getAttribute('contenteditable')).toBe('false');
		await rerender({ readonly: false });
		await vi.waitFor(() =>
			expect(content().element().getAttribute('contenteditable')).toBe('true')
		);
	});

	it('calls onblur when focus leaves the editor', async () => {
		const onblur = vi.fn();
		await render(MarkdownEditor, { markdown: 'text', onblur });
		await userEvent.click(content());
		(document.activeElement as HTMLElement).blur();
		await vi.waitFor(() => expect(onblur).toHaveBeenCalled());
	});

	it('applies class names and removes the popup container on unmount', async () => {
		const { container, unmount } = await render(MarkdownEditor, {
			markdown: 'text',
			class: 'mine',
			contentEditableClass: 'prose'
		});
		expect(container.querySelector('.sveltedown.mine')).not.toBeNull();
		expect(content().element().classList.contains('prose')).toBe(true);
		await vi.waitFor(() =>
			expect(document.querySelector('.sveltedown-popup-container.mine')).not.toBeNull()
		);
		await unmount();
		expect(document.querySelector('.sveltedown-popup-container.mine')).toBeNull();
	});

	it('runs plugin init, postInit and update', async () => {
		const calls: string[] = [];
		let realm: Realm | undefined;
		const plugin: RealmPlugin = {
			init: () => calls.push('init'),
			postInit: (r) => {
				realm = r;
				calls.push('postInit');
			},
			update: () => calls.push('update')
		};
		await render(MarkdownEditor, { markdown: '', plugins: [plugin] });
		await vi.waitFor(() => expect(calls).toEqual(['init', 'postInit', 'update']));
		expect(realm?.getValue(rootEditor$)).not.toBeNull();
	});
});

// The rest of upstream's formatting cases: formats spanning and nesting inside each other.
describe('nested formatting', () => {
	it('works with underline around emphasis inside a word', () =>
		testIdenticalMarkdown('a<u>***Hello***</u>a World'));

	it.each([
		'***arp*:** Displays tables',
		'***a* b**',
		'***a `c`* b**',
		'~~a **b** c~~',
		'~~**a** b~~',
		'==**a** b==',
		'~~***a*** b~~'
	])('keeps a format that runs past a nested one intact: %s', (markdown) =>
		testIdenticalMarkdown(markdown)
	);

	it.each([
		['**<kbd>a</kbd> b**', '<kbd>**a**</kbd> **b**'],
		['**<span style="color: red">a</span> b**', '<span style="color: red">**a**</span> **b**'],
		['<span style="color: red">**a** b</span>', '<span style="color: red">**a** b</span>']
	])(
		'keeps the surrounding formatting of text inside inline elements: %s',
		async (markdown, expected) => {
			expect(await roundTrip(markdown)).toEqual(expected);
		}
	);
});

describe('bind:markdown', () => {
	it('writes edits back to the bound value', async () => {
		let value = $state('abc');
		await render(MarkdownEditor, {
			get markdown() {
				return value;
			},
			set markdown(next) {
				value = next;
			}
		});
		await userEvent.click(content());
		await userEvent.keyboard('{End}!');
		await vi.waitFor(() => expect(value).toBe('abc!'));
	});
});

describe('unsupported constructs', () => {
	it('reports a construct whose plugin is missing, without losing the source', async () => {
		const onerror = vi.fn();
		const { component } = await render(MarkdownEditor, { markdown: '# Heading', onerror });
		await vi.waitFor(() => expect(onerror).toHaveBeenCalled());
		expect(onerror.mock.calls[0][0].source).toBe('# Heading');
		expect(component.getMarkdown()).toBe('# Heading');
	});
});
