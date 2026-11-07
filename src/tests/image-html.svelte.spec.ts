// Resized images (written as `<img>` tags) and image alignment.
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { ImageAlignment, MarkdownEditorMethods } from '#lib';
import ImageEditorHarness from './fixtures/ImageEditorHarness.svelte';
import { expectSoon } from './dom.js';

async function setup(markdown: string, alignment?: ImageAlignment) {
	const props = $state({
		markdown,
		alignment,
		editor: undefined as MarkdownEditorMethods | undefined
	});
	const view = await render(ImageEditorHarness, props);
	await expectSoon(() => props.editor !== undefined);
	await expectSoon(() => view.container.querySelector('.sd-image-wrapper') !== null);
	return { ...view, markdown: () => props.editor!.getMarkdown() };
}

describe('images written as tags', () => {
	it('keeps a relative src and its attributes as written', async () => {
		const { markdown } = await setup(
			'<img width="300" height="200" alt="Logo" title="The logo" src="assets/logo.png" />'
		);
		const out = markdown();
		expect(out).toContain('src="assets/logo.png"');
		expect(out).not.toContain('http');
		expect(out).toContain('width="300"');
		expect(out).toContain('height="200"');
		expect(out).toContain('alt="Logo"');
		expect(out).toContain('title="The logo"');
	});

	it('reads an image without a size as plain Markdown', async () => {
		const { markdown } = await setup('<img alt="Logo" src="../assets/logo.png" />');
		expect(markdown().trim()).toBe('![Logo](../assets/logo.png)');
	});
});

describe('image alignment', () => {
	it('sits at the start by default', async () => {
		const { container } = await setup('![Logo](logo.png)');
		const wrapper = container.querySelector<HTMLElement>('.sd-image-wrapper')!;
		expect(wrapper.dataset.align).toBe('start');
		expect(getComputedStyle(wrapper).display).toBe('inline-block');
	});

	it('centers each image when configured', async () => {
		const { container } = await setup('![Logo](logo.png)', 'center');
		const wrapper = container.querySelector<HTMLElement>('.sd-image-wrapper')!;
		expect(wrapper.dataset.align).toBe('center');
		expect(getComputedStyle(wrapper).display).toBe('block');
	});
});
