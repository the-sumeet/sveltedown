import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import MarkdownEditor from './MarkdownEditor.svelte';

const content = () => page.elementLocator(document.querySelector('.cm-content')!);

describe('MarkdownEditor', () => {
	it('renders the initial value', async () => {
		await render(MarkdownEditor, { value: '# Hello' });
		await expect.element(content()).toHaveTextContent('# Hello');
	});

	it('calls onchange when the user types', async () => {
		const onchange = vi.fn();
		await render(MarkdownEditor, { value: 'abc', onchange });
		await userEvent.click(content());
		await userEvent.keyboard('{End}!');
		expect(onchange).toHaveBeenLastCalledWith('abc!');
	});

	it('applies external value updates without echoing onchange', async () => {
		const onchange = vi.fn();
		const { rerender } = await render(MarkdownEditor, { value: 'one', onchange });
		await rerender({ value: 'two\nthree' });
		await tick();
		await expect.element(content()).toHaveTextContent('twothree');
		expect(onchange).not.toHaveBeenCalled();
	});

	it('hides bold markers away from the cursor and reveals them inside', async () => {
		await render(MarkdownEditor, { value: 'x **bold** y' });
		const el = document.querySelector('.cm-content')!;
		await expect.element(content()).toHaveTextContent('x bold y');
		expect(el.querySelector('.cm-md-strong')?.textContent).toBe('bold');

		await userEvent.click(content());
		await userEvent.keyboard('{Home}{ArrowRight}{ArrowRight}{ArrowRight}');
		await expect.element(content()).toHaveTextContent('x **bold** y');

		await userEvent.keyboard('{End}');
		await expect.element(content()).toHaveTextContent('x bold y');
	});

	it('formats with keyboard shortcuts', async () => {
		const onchange = vi.fn();
		await render(MarkdownEditor, { value: 'hello world', onchange });
		await userEvent.click(content());
		await userEvent.keyboard('{End}{ArrowLeft}');
		await userEvent.keyboard('{ControlOrMeta>}b{/ControlOrMeta}');
		expect(onchange).toHaveBeenLastCalledWith('hello **world**');
		await userEvent.keyboard('{ControlOrMeta>}i{/ControlOrMeta}');
		expect(onchange).toHaveBeenLastCalledWith('hello ***world***');
		await userEvent.keyboard('{ControlOrMeta>}b{/ControlOrMeta}');
		expect(onchange).toHaveBeenLastCalledWith('hello *world*');
		await userEvent.keyboard('{ControlOrMeta>}k{/ControlOrMeta}https://x.dev');
		expect(onchange).toHaveBeenLastCalledWith('hello *[world](https://x.dev)*');
	});

	it('continues task lists on Enter', async () => {
		const onchange = vi.fn();
		await render(MarkdownEditor, { value: '- [ ] one', onchange });
		await userEvent.click(content());
		await userEvent.keyboard('{ControlOrMeta>}{End}{/ControlOrMeta}{Enter}two');
		expect(onchange).toHaveBeenLastCalledWith('- [ ] one\n- [ ] two');
	});

	describe('theme', () => {
		const color = (selector: string) => getComputedStyle(document.querySelector(selector)!).color;

		it('reads colours from CSS variables', async () => {
			await render(MarkdownEditor, { value: 'see [docs](https://x.dev)', class: 'custom' });
			const style = document.createElement('style');
			style.textContent = '.custom { --md-link-color: rgb(255, 0, 0); }';
			document.head.append(style);
			expect(color('.cm-md-link')).toBe('rgb(255, 0, 0)');
			style.remove();
		});

		it('switches to dark colours with data-theme', async () => {
			await render(MarkdownEditor, { value: 'text' });
			const light = color('.cm-editor');
			document.documentElement.dataset.theme = 'dark';
			const dark = color('.cm-editor');
			document.documentElement.dataset.theme = 'light';
			expect(color('.cm-editor')).toBe(light);
			delete document.documentElement.dataset.theme;
			expect(dark).not.toBe(light);
			expect(dark).toBe('rgb(230, 237, 243)');
		});
	});

	it('honours readonly', async () => {
		await render(MarkdownEditor, { value: 'x', readonly: true });
		await expect.element(content()).toHaveAttribute('contenteditable', 'false');
	});
});
