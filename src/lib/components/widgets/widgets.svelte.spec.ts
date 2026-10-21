import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import MarkdownEditor from '../MarkdownEditor.svelte';
import { SvelteWidget } from '../../cm/utils/svelte-widget.svelte.js';
import type { ImageSnippetProps, TableSnippetProps } from '../../types.js';

// 1x1 transparent PNG, so no network is involved.
const PIXEL =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

describe('task checkboxes', () => {
	it('toggles the Markdown source when clicked', async () => {
		const onchange = vi.fn();
		await render(MarkdownEditor, { value: 'intro\n\n- [ ] todo', onchange });
		const box = page.getByRole('checkbox');
		await expect.element(box).not.toBeChecked();

		await box.click();
		expect(onchange).toHaveBeenLastCalledWith('intro\n\n- [x] todo');
		await expect.element(box).toBeChecked();

		await box.click();
		expect(onchange).toHaveBeenLastCalledWith('intro\n\n- [ ] todo');
		await expect.element(box).not.toBeChecked();
	});

	it('does not toggle in a read-only editor', async () => {
		const onchange = vi.fn();
		await render(MarkdownEditor, { value: '- [ ] todo', readonly: true, onchange });
		const box = page.getByRole('checkbox');
		await box.click();
		await expect.element(box).not.toBeChecked();
		expect(onchange).not.toHaveBeenCalled();
	});
});

describe('images', () => {
	it('renders an image preview away from the cursor', async () => {
		await render(MarkdownEditor, { value: `intro\n\n![a pixel](${PIXEL})` });
		await expect.element(page.getByRole('img', { name: 'a pixel' })).toBeInTheDocument();
	});

	it('shows a fallback when the image fails to load', async () => {
		await render(MarkdownEditor, { value: 'intro\n\n![broken](data:image/png;base64,AAAA)' });
		await expect.element(page.getByText('Image failed to load: broken')).toBeInTheDocument();
	});

	it('renders a custom image snippet', async () => {
		const imageSnippet = createRawSnippet<[ImageSnippetProps]>((props) => ({
			render: () => `<em class="custom-image">${props().alt}</em>`
		}));
		await render(MarkdownEditor, { value: `intro\n\n![custom](${PIXEL})`, imageSnippet });
		await expect.element(page.getByText('custom')).toHaveClass('custom-image');
		expect(document.querySelector('.cm-md-image img')).toBeNull();
	});
});

describe('code blocks', () => {
	it('shows the language and a copy button away from the cursor', async () => {
		await render(MarkdownEditor, { value: 'intro\n\n```ts\nlet a = 1;\n```' });
		await expect.element(page.getByText('ts', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
		expect(document.querySelector('.cm-content')!.textContent).not.toContain('```');
	});

	const longLine = `const x = [${'1, '.repeat(200)}];`;
	const longParagraph = 'words '.repeat(200);
	const longDoc = `intro\n\n\`\`\`js\n${longLine}\n\`\`\`\n\n${longParagraph}`;
	const scroller = () => document.querySelector<HTMLElement>('.cm-scroller')!;

	it('scrolls long lines inside the rendered block, not the editor', async () => {
		await render(MarkdownEditor, { value: longDoc });
		await expect.element(page.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
		const pre = document.querySelector<HTMLElement>('.cm-md-code-pre')!;
		expect(pre.scrollWidth).toBeGreaterThan(pre.clientWidth);
		expect(pre.getClientRects()[0].height).toBeLessThan(60);
		expect(scroller().scrollWidth).toBeLessThanOrEqual(scroller().clientWidth);
	});

	it('does not wrap long lines while editing the block', async () => {
		await render(MarkdownEditor, { value: longDoc });
		await page.elementLocator(document.querySelector('.cm-md-code-pre')!).click();
		await expect.element(page.getByText('```js')).toBeInTheDocument();
		const line = [...document.querySelectorAll<HTMLElement>('.cm-line')].find((l) =>
			l.textContent?.startsWith('const x')
		)!;
		expect(line.classList).toContain('cm-md-codeblock');
		const oneLine = document.querySelector<HTMLElement>('.cm-line')!.offsetHeight;
		expect(line.offsetHeight).toBeLessThan(oneLine * 1.5);
		expect(scroller().scrollWidth).toBeGreaterThan(scroller().clientWidth);

		// Other text keeps wrapping at the editor width.
		const paragraph = [...document.querySelectorAll<HTMLElement>('.cm-line')].find((l) =>
			l.textContent?.startsWith('words')
		)!;
		expect(paragraph.offsetHeight).toBeGreaterThan(oneLine * 2);
	});

	it('opens the block with the cursor at the clicked character', async () => {
		const onchange = vi.fn();
		await render(MarkdownEditor, { value: 'intro\n\n```\nlet abc = 1;\n```', onchange });
		const code = document.querySelector('.cm-md-code-pre code')!;
		const range = document.createRange();
		range.setStart(code.firstChild!, 4);
		range.setEnd(code.firstChild!, 5);
		const char = range.getBoundingClientRect();
		const pre = code.parentElement!.getBoundingClientRect();
		await page.elementLocator(code.parentElement!).click({
			position: { x: char.left - pre.left + 1, y: char.top - pre.top + char.height / 2 }
		});
		await userEvent.keyboard('Z');
		expect(onchange).toHaveBeenLastCalledWith('intro\n\n```\nlet Zabc = 1;\n```');
	});

	it('moves End to the real end of a long line and scrolls to it', async () => {
		const onchange = vi.fn();
		await render(MarkdownEditor, { value: longDoc, onchange });
		await page.elementLocator(document.querySelector('.cm-md-code-pre')!).click({
			position: { x: 5, y: 10 }
		});
		await userEvent.keyboard('{End}');
		await expect.poll(() => scroller().scrollLeft).toBeGreaterThan(0);
		await userEvent.keyboard('!');
		expect(onchange.mock.lastCall![0]).toContain(`${longLine}!`);

		await userEvent.keyboard('{Home}');
		// Scrolled back far enough that the cursor at the line start is visible.
		const cursorVisible = () => {
			const range = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
			const box = scroller().getBoundingClientRect();
			return range.left >= box.left && range.left <= box.right;
		};
		await expect.poll(cursorVisible).toBe(true);
		expect(scroller().scrollLeft).toBeLessThan(100);
	});
});

describe('tables', () => {
	const doc =
		'intro\n\n| Name | **Qty** |\n|:-----|----:|\n| apple | 3 |\n| [pear](https://x.dev) | `12` |';

	it('renders an HTML table with alignment and formatted cells', async () => {
		await render(MarkdownEditor, { value: doc });
		const table = page.getByRole('table');
		await expect.element(table).toBeInTheDocument();
		const [, qty] = document.querySelectorAll('th');
		expect(qty.style.textAlign).toBe('right');
		expect(document.querySelector('th .cm-md-strong')?.textContent).toBe('Qty');
		expect(document.querySelector('td .cm-md-code')?.textContent).toBe('12');
		expect(document.querySelector('td .cm-md-link')?.getAttribute('data-url')).toBe(
			'https://x.dev'
		);
		expect(document.querySelector('.cm-content')!.textContent).not.toContain('|');
	});

	it('opens the source with the cursor at the clicked character', async () => {
		const onchange = vi.fn();
		await render(MarkdownEditor, { value: doc, onchange });
		const cell = [...document.querySelectorAll('td span')].find((s) => s.textContent === 'apple')!;
		const range = document.createRange();
		range.setStart(cell.firstChild!, 2);
		range.setEnd(cell.firstChild!, 3);
		const char = range.getBoundingClientRect();
		const box = cell.getBoundingClientRect();
		await page.elementLocator(cell).click({
			position: { x: char.left - box.left + 1, y: char.height / 2 }
		});
		await userEvent.keyboard('Z');
		expect(onchange.mock.lastCall![0]).toContain('| apZple | 3 |');
	});

	it('formats the table with Mod-Shift-f', async () => {
		const onchange = vi.fn();
		await render(MarkdownEditor, { value: '|a|bb|\n|-|-:|\n|ccc|d|', onchange });
		await userEvent.click(page.getByRole('cell', { name: 'ccc' }));
		await userEvent.keyboard('{ControlOrMeta>}{Shift>}f{/Shift}{/ControlOrMeta}');
		expect(onchange).toHaveBeenLastCalledWith('| a   |  bb |\n| --- | --: |\n| ccc |   d |');
	});

	it('scrolls a wide table inside its own box instead of crushing its columns', async () => {
		const cols = Array.from({ length: 12 }, (_, i) => `Column ${i + 1}`);
		const value = `| ${cols.join(' | ')} |\n|${cols.map(() => '---').join('|')}|\n| ${cols.join(' | ')} |`;
		await render(MarkdownEditor, { value: `intro\n\n${value}` });
		await expect.element(page.getByRole('table')).toBeInTheDocument();
		const box = document.querySelector<HTMLElement>('.cm-md-table-scroll')!;
		const th = box.querySelector('th')!;
		const lineHeight = parseFloat(getComputedStyle(th).lineHeight);
		expect(box.scrollWidth).toBeGreaterThan(box.clientWidth);
		expect(th.clientHeight).toBeLessThan(lineHeight * 2 + 20);
		const scroller = document.querySelector<HTMLElement>('.cm-scroller')!;
		expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
	});

	it('renders a custom table snippet', async () => {
		const tableSnippet = createRawSnippet<[TableSnippetProps]>((props) => ({
			render: () => `<p class="custom-table">${props().table.header.length} columns</p>`
		}));
		await render(MarkdownEditor, { value: doc, tableSnippet });
		await expect.element(page.getByText('2 columns')).toBeInTheDocument();
	});
});

describe('review regressions', () => {
	it('keeps a code block rendered when clicked in a read-only editor', async () => {
		await render(MarkdownEditor, { value: 'intro\n\n```js\nlet a = 1;\n```', readonly: true });
		await page.elementLocator(document.querySelector('.cm-md-code-pre')!).click();
		await expect.element(page.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
		expect(document.querySelector('.cm-content')!.textContent).not.toContain('```');
	});

	it('keeps the list bullet visible next to a code block', async () => {
		await render(MarkdownEditor, { value: 'intro\n\n- ```js\n  code\n  ```\n\nend' });
		await expect.element(page.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
		const lines = [...document.querySelectorAll('.cm-line')].map((l) => l.textContent);
		expect(lines).toContain('- ');
	});
});

describe('cleanup', () => {
	it('unmounts every Svelte widget when the editor is destroyed', async () => {
		const toDOM = vi.spyOn(SvelteWidget.prototype, 'toDOM');
		const destroy = vi.spyOn(SvelteWidget.prototype, 'destroy');
		const { unmount } = await render(MarkdownEditor, {
			value: `intro\n\n![a](${PIXEL})\n\n- [ ] one\n- [x] two\n\n\`\`\`\ncode\n\`\`\``
		});
		await expect.element(page.getByRole('img')).toBeInTheDocument();
		expect(toDOM).toHaveBeenCalledTimes(4);

		await unmount();
		expect(destroy).toHaveBeenCalledTimes(4);
		toDOM.mockRestore();
		destroy.mockRestore();
	});
});
