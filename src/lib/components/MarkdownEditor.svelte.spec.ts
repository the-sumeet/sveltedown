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

	it('honours readonly', async () => {
		await render(MarkdownEditor, { value: 'x', readonly: true });
		await expect.element(content()).toHaveAttribute('contenteditable', 'false');
	});
});
