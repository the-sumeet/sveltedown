// Condensed port of upstream's src/test/image-upload-lifecycle.test.tsx and
// table-image-dialog.test.tsx: the dialog and imperative upload contracts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import {
	closeImageDialog$,
	imageUploadState$,
	insertImage$,
	openNewImageDialog$,
	type MarkdownEditorMethods,
	type Realm
} from '#lib';
import ImageEditorHarness from '../fixtures/ImageEditorHarness.svelte';
import { expectSoon, setValue } from '../dom.js';

const url = 'https://example.com/upload.png';
const file = new File(['image'], 'upload.png', { type: 'image/png' });

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

function deferred() {
	let resolve!: (value: string) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<string>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}

const contentFor = {
	root: (content: string) => content,
	table: (content: string) => `| A | B |\n| --- | --- |\n| ${content} | Other |`,
	directive: (content: string) => `:::note\n${content}\n:::`
};

async function setup(location: keyof typeof contentFor, upload: (file: File) => Promise<string>) {
	let realm!: Realm;
	const props = $state({
		markdown: contentFor[location]('Hello'),
		upload,
		editor: undefined as MarkdownEditorMethods | undefined,
		onRealm: (r: Realm) => (realm = r)
	});
	const view = await render(ImageEditorHarness, props);
	await expectSoon(() => props.editor !== undefined);
	return { ...view, realm, markdown: () => props.editor!.getMarkdown(), props };
}

async function focusLocation(container: HTMLElement, location: keyof typeof contentFor) {
	const selector =
		location === 'root'
			? '.sd-content-editable'
			: location === 'table'
				? 'tbody td [contenteditable="true"]'
				: '.sd-admonition-note [contenteditable="true"]';
	await expectSoon(() => container.querySelector(selector) !== null);
	const element = container.querySelector<HTMLElement>(selector)!;
	element.focus();
	await new Promise((resolve) => setTimeout(resolve, 50));
}

const dialog = () => page.getByRole('dialog', { name: 'Upload an image' });

async function chooseFileAndSave() {
	await expect.element(dialog()).toBeInTheDocument();
	const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
	const transfer = new DataTransfer();
	transfer.items.add(file);
	input.files = transfer.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));
	(page.getByRole('button', { name: 'Save' }).element() as HTMLElement).click();
}

describe('image dialog upload lifecycle', () => {
	it.each(['root', 'table', 'directive'] as const)(
		'shows pending state and saves once in %s',
		async (location) => {
			const pending = deferred();
			const upload = vi.fn(() => pending.promise);
			const { container, realm, markdown } = await setup(location, upload);
			await focusLocation(container, location);
			realm.pub(openNewImageDialog$);
			await chooseFileAndSave();
			await expect.element(page.getByRole('status')).toHaveTextContent('Uploading image…');
			expect(realm.getValue(imageUploadState$)).toBe('uploading');
			expect(
				(page.getByRole('button', { name: 'Save' }).element() as HTMLButtonElement).disabled
			).toBe(true);
			pending.resolve(url);
			await expect.element(dialog()).not.toBeInTheDocument();
			await expectSoon(() => markdown().includes(url));
			expect(upload).toHaveBeenCalledTimes(1);
			expect(markdown().split(url)).toHaveLength(2);
		}
	);

	it.each(['reject', 'throw'] as const)('retains input and retries after a %s', async (failure) => {
		let attempt = 0;
		const upload = vi.fn(async () => {
			attempt++;
			if (attempt === 1) {
				if (failure === 'throw') throw new Error('upload failed');
				return Promise.reject(new Error('upload failed'));
			}
			return url;
		});
		const { container, realm, markdown } = await setup('root', upload);
		await focusLocation(container, 'root');
		realm.pub(openNewImageDialog$);
		await expect.element(dialog()).toBeInTheDocument();
		setValue(page.getByLabelText('Alt:').element(), 'kept alt');
		await chooseFileAndSave();
		await expect.element(page.getByRole('alert')).toHaveTextContent('Image upload failed');
		expect((page.getByLabelText('Alt:').element() as HTMLInputElement).value).toBe('kept alt');
		(page.getByRole('button', { name: 'Save' }).element() as HTMLElement).click();
		await expectSoon(() => markdown().includes(url));
		expect(markdown()).toContain('![kept alt]');
		expect(upload).toHaveBeenCalledTimes(2);
	});

	it.each(['Cancel', 'Escape'] as const)('ignores a late upload after %s', async (dismissal) => {
		const pending = deferred();
		const { container, realm, markdown } = await setup('root', () => pending.promise);
		await focusLocation(container, 'root');
		realm.pub(openNewImageDialog$);
		await chooseFileAndSave();
		await expect.element(page.getByRole('status')).toBeInTheDocument();
		if (dismissal === 'Cancel') {
			(page.getByRole('button', { name: 'Cancel' }).element() as HTMLElement).click();
		} else {
			realm.pub(closeImageDialog$);
		}
		await expect.element(dialog()).not.toBeInTheDocument();
		pending.resolve(url);
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(markdown()).not.toContain(url);
	});

	it('keeps a pending upload for a no-op setMarkdown', async () => {
		const pending = deferred();
		const { container, realm, markdown, props } = await setup('root', () => pending.promise);
		await focusLocation(container, 'root');
		realm.pub(openNewImageDialog$);
		await chooseFileAndSave();
		await expect.element(page.getByRole('status')).toBeInTheDocument();
		props.editor!.setMarkdown(markdown());
		pending.resolve(url);
		await expectSoon(() => markdown().includes(url));
		expect(markdown()).toContain(url);
	});

	it('discards a pending upload when setMarkdown replaces the document', async () => {
		const pending = deferred();
		const { container, realm, markdown, props } = await setup('root', () => pending.promise);
		await focusLocation(container, 'root');
		realm.pub(openNewImageDialog$);
		await chooseFileAndSave();
		await expect.element(page.getByRole('status')).toBeInTheDocument();
		props.editor!.setMarkdown('Replaced');
		await expect.element(dialog()).not.toBeInTheDocument();
		pending.resolve(url);
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(markdown()).toBe('Replaced');
	});
});

describe('imperative image upload lifecycle', () => {
	it.each(['root', 'table', 'directive'] as const)(
		'inserts an uploaded file into the %s editor selected at invocation',
		async (location) => {
			const pending = deferred();
			const { container, realm, markdown } = await setup(location, () => pending.promise);
			await focusLocation(container, location);
			realm.pub(insertImage$, { file, altText: 'imperative' });
			pending.resolve(url);
			await expectSoon(() => markdown().includes(url));
			expect(markdown()).toContain('![imperative]');
		}
	);

	it('allows independent imperative uploads to finish in either order', async () => {
		const first = deferred();
		const second = deferred();
		const queue = [first, second];
		const { container, realm, markdown } = await setup('root', () => queue.shift()!.promise);
		await focusLocation(container, 'root');
		realm.pub(insertImage$, { file, altText: 'first' });
		realm.pub(insertImage$, { file, altText: 'second' });
		second.resolve('https://example.com/second.png');
		first.resolve('https://example.com/first.png');
		await expectSoon(() => markdown().includes('first.png') && markdown().includes('second.png'));
		expect(markdown()).toContain('first.png');
	});

	it('preserves immediate URL insertion and metadata without an upload handler', async () => {
		const { container, realm, markdown } = await setup('root', () => Promise.resolve(url));
		await focusLocation(container, 'root');
		realm.pub(insertImage$, { src: url, altText: 'alt', title: 'title' });
		await expectSoon(() => markdown().includes(url));
		expect(markdown()).toContain(`![alt](${url} "title")`);
	});
});
