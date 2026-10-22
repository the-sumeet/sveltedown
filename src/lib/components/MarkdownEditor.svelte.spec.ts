import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import { EditorView } from '@codemirror/view';
import MarkdownEditor from './MarkdownEditor.svelte';

const content = () => page.elementLocator(document.querySelector('.cm-content')!);

describe('MarkdownEditor', () => {
	it('renders the initial value fully rendered until the editor is focused', async () => {
		await render(MarkdownEditor, { value: '# Hello' });
		await expect.element(content()).toHaveTextContent(/^Hello$/);
		await userEvent.click(content());
		await expect.element(content()).toHaveTextContent('# Hello');
	});

	it('hides revealed syntax again when the editor loses focus', async () => {
		await render(MarkdownEditor, { value: 'a **b** c' });
		await userEvent.click(page.getByText('b', { exact: true }));
		await expect.element(content()).toHaveTextContent('a **b** c');
		(document.activeElement as HTMLElement).blur();
		await expect.element(content()).toHaveTextContent('a b c');
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

	it('dispatches nothing on mount or for values it already has', async () => {
		let transactions = 0;
		const counter = EditorView.updateListener.of((u) => (transactions += u.transactions.length));
		const extensions = [counter];
		const { rerender } = await render(MarkdownEditor, { value: 'x', extensions });
		await tick();
		expect(transactions).toBe(0);
		await rerender({ value: 'x', extensions, readonly: false, placeholder: '' });
		await tick();
		expect(transactions).toBe(0);
		await rerender({ value: 'y', extensions });
		await tick();
		expect(transactions).toBe(1);
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

		it('lets the nearest data-theme win', async () => {
			document.documentElement.dataset.theme = 'dark';
			const wrapper = document.createElement('div');
			wrapper.dataset.theme = 'light';
			document.body.append(wrapper);
			await render(MarkdownEditor, { value: 'text' }, { baseElement: wrapper });
			const editor = wrapper.querySelector('.cm-editor')!;
			expect(getComputedStyle(editor).color).toBe('rgb(31, 35, 40)');
			delete document.documentElement.dataset.theme;
			wrapper.remove();
		});
	});

	it('honours readonly', async () => {
		await render(MarkdownEditor, { value: 'x', readonly: true });
		await expect.element(content()).toHaveAttribute('contenteditable', 'false');
	});

	describe('onlinkclick', () => {
		it('receives followed links and can stop them opening', async () => {
			const open = vi.spyOn(window, 'open').mockReturnValue(null);
			const onlinkclick = vi.fn(() => true);
			await render(MarkdownEditor, {
				value: 'see [notes](<../a b.md>) x',
				readonly: true,
				onlinkclick
			});
			await userEvent.click(page.getByText('notes'));
			expect(onlinkclick).toHaveBeenCalledWith('../a b.md', expect.any(MouseEvent));
			expect(open).not.toHaveBeenCalled();
			open.mockRestore();
		});

		it('opens the link as usual when not handled', async () => {
			const open = vi.spyOn(window, 'open').mockReturnValue(null);
			const onlinkclick = vi.fn();
			await render(MarkdownEditor, {
				value: 'see [docs](https://x.dev) x',
				readonly: true,
				onlinkclick
			});
			await userEvent.click(page.getByText('docs'));
			expect(onlinkclick).toHaveBeenCalledWith('https://x.dev', expect.any(MouseEvent));
			expect(open).toHaveBeenCalledWith('https://x.dev/', '_blank', 'noopener');
			open.mockRestore();
		});

		it('does not run for a plain click in an editable editor', async () => {
			const onlinkclick = vi.fn();
			await render(MarkdownEditor, { value: 'see [docs](https://x.dev) x', onlinkclick });
			await userEvent.click(page.getByText('docs'));
			expect(onlinkclick).not.toHaveBeenCalled();
		});
	});
});
