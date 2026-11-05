// Ported from upstream's src/test/dialog-a11y.test.tsx and toolbar.test.tsx.
import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { frontmatterPlugin, imagePlugin } from '#lib';
import ToolbarEditor from '../fixtures/ToolbarEditor.svelte';
import InsertImageToolbar from '../fixtures/InsertImageToolbar.svelte';
import YoutubeDialogButton from '../fixtures/YoutubeDialogButton.svelte';
import InsertFrontmatterTrigger from '../fixtures/InsertFrontmatterTrigger.svelte';
import AccessibleToolbar from '../fixtures/AccessibleToolbar.svelte';

async function expectDialogDescription(name: string, description: string) {
	const dialog = page.getByRole('dialog', { name });
	await expect.element(dialog).toBeInTheDocument();
	const describedById = dialog.element().getAttribute('aria-describedby');
	expect(describedById).toBeTruthy();
	expect(document.getElementById(describedById!)?.textContent).toContain(description);
}

const click = async (name: string) => {
	const button = page.getByRole('button', { name, exact: true });
	await expect.element(button).toBeInTheDocument();
	(button.element() as HTMLElement).click();
};

describe('editor dialog accessibility', () => {
	it('describes the image dialog', async () => {
		await render(ToolbarEditor, {
			markdown: '',
			plugins: [
				imagePlugin({ imageUploadHandler: () => Promise.resolve('https://example.com/image.png') })
			],
			toolbar: InsertImageToolbar
		});
		await click('Insert image');
		await expectDialogDescription(
			'Upload an image',
			'Insert an image from a URL or upload one from your device.'
		);
	});

	it('does not announce device upload when the image dialog has no upload handler', async () => {
		await render(ToolbarEditor, {
			markdown: '',
			plugins: [imagePlugin()],
			toolbar: InsertImageToolbar
		});
		await click('Insert image');
		await expectDialogDescription('Upload an image', 'Insert an image from a URL.');
	});

	it('names and describes the shared toolbar dialog', async () => {
		await render(ToolbarEditor, { markdown: '', toolbar: YoutubeDialogButton });
		await click('Insert YouTube video');
		await expectDialogDescription('Insert YouTube video', 'Paste URL');
	});

	it('describes the frontmatter dialog', async () => {
		await render(ToolbarEditor, {
			markdown: '---\ntitle: hello\n---\n\nbody',
			plugins: [frontmatterPlugin()],
			toolbar: InsertFrontmatterTrigger
		});
		await click('Edit frontmatter');
		await expectDialogDescription(
			'Edit document frontmatter',
			'Add, edit, or remove the key-value entries of the document frontmatter.'
		);
	});
});

describe('toolbar accessibility', () => {
	it('exposes accessible names for icon-only toolbar controls', async () => {
		await render(ToolbarEditor, {
			markdown: '',
			plugins: [imagePlugin()],
			toolbar: AccessibleToolbar
		});
		await expect
			.element(page.getByRole('button', { name: 'Insert code block' }))
			.toBeInTheDocument();
		await expect.element(page.getByLabelText('Insert admonition')).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Insert YouTube video' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Insert image' })).toBeInTheDocument();
		await click('Insert YouTube video');
		await expect.element(page.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
	});
});
