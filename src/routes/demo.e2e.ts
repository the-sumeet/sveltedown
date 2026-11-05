import { expect, test, type Page } from '@playwright/test';

const editor = (page: Page) => page.getByRole('textbox', { name: 'editable markdown' });
const source = (page: Page) => page.getByRole('textbox', { name: 'Markdown', exact: true });
const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name });
const toggle = (page: Page, name: string | RegExp) => page.getByRole('radio', { name });
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

const errorsByPage = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
	const errors: string[] = [];
	errorsByPage.set(page, errors);
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	await page.goto('/');
	await expect(editor(page)).toBeVisible();
	await page.locator('summary').click();
});

test.afterEach(async ({ page }) => {
	expect(errorsByPage.get(page), 'unexpected browser errors').toEqual([]);
});

/** Replaces the document, through the bound markdown, and puts the cursor at its end. */
async function setDocument(page: Page, markdown: string) {
	await source(page).fill(markdown);
	await page.waitForTimeout(50);
	await focusEnd(page);
}

async function focusEnd(page: Page) {
	await editor(page).evaluate((element) => (element as HTMLElement).focus());
	await page.keyboard.press(`${mod}+ArrowDown`);
	await page.keyboard.press('End');
}

async function selectAll(page: Page) {
	await page.keyboard.press('ControlOrMeta+a');
}

test.describe('page', () => {
	test('server-renders the page and editor container', async ({ request }) => {
		const response = await request.get('/');
		expect(response.ok()).toBe(true);
		const html = await response.text();
		expect(html).toContain('class="sveltedown');
		expect(html).toContain('sveltedown playground');
	});

	test('renders the whole sample without losing anything', async ({ page }) => {
		const markdown = await source(page).inputValue();
		for (const expected of [
			'title: Welcome to sveltedown',
			'# Welcome to sveltedown',
			'* [x] Finished task',
			'| Feature',
			'```ts',
			'> Markdown stays Markdown',
			':::tip',
			'![The Svelte logo](/favicon.svg "Favicon")',
			'<BlockNode>',
			'<MyLeaf foo="bar">'
		]) {
			expect(markdown).toContain(expected);
		}
	});

	test('the bound markdown updates the editor', async ({ page }) => {
		await source(page).fill('Some **new** text');
		await expect(editor(page)).toHaveText('Some new text');
		await expect(editor(page).locator('strong')).toHaveText('new');
	});
});

test.describe('toolbar formatting', () => {
	test('toggles bold, italic, underline, code and highlight on a selection', async ({ page }) => {
		for (const [name, expected] of [
			['Bold', '**word**'],
			['Italic', '*word*'],
			['Underline', '<u>word</u>'],
			['Inline code format', '`word`'],
			['Highlight', '==word==']
		] as const) {
			await setDocument(page, 'word');
			await selectAll(page);
			await toggle(page, name).click();
			await expect(source(page)).toHaveValue(expected);
		}
	});

	test('toggles strikethrough, superscript and subscript', async ({ page }) => {
		for (const [name, expected] of [
			['Strikethrough', '~~word~~'],
			['Superscript', '<sup>word</sup>'],
			['Subscript', '<sub>word</sub>']
		] as const) {
			await setDocument(page, 'word');
			await selectAll(page);
			await toggle(page, name).click();
			await expect(source(page)).toHaveValue(expected);
		}
	});

	test('undo and redo buttons', async ({ page }) => {
		await setDocument(page, 'word');
		await page.keyboard.type(' more');
		await expect(source(page)).toHaveValue('word more');
		// Like MDXEditor, the last typed character is a separate undo step.
		await toggle(page, /^Undo/).click();
		await expect(source(page)).not.toHaveValue('word more');
		await toggle(page, /^Redo/).click();
		await expect(source(page)).toHaveValue('word more');
	});

	test('shows the formatting of the selection', async ({ page }) => {
		await setDocument(page, '**word**');
		await expect(toggle(page, 'Remove bold')).toHaveAttribute('data-state', 'on');
		await source(page).fill('plain');
		await focusEnd(page);
		await expect(toggle(page, 'Bold')).toHaveAttribute('data-state', 'off');
	});

	test('changes the block type', async ({ page }) => {
		await setDocument(page, 'word');
		await page.getByRole('combobox', { name: 'Block type' }).click();
		await page.getByRole('option', { name: 'Heading 2' }).click();
		await expect(source(page)).toHaveValue('## word');
		await focusEnd(page);
		await page.getByRole('combobox', { name: 'Block type' }).click();
		await page.getByRole('option', { name: 'Quote' }).click();
		await expect(source(page)).toHaveValue('> word');
		await focusEnd(page);
		await page.getByRole('combobox', { name: 'Block type' }).click();
		await page.getByRole('option', { name: 'Paragraph' }).click();
		await expect(source(page)).toHaveValue('word');
	});

	test('toggles between list types', async ({ page }) => {
		await setDocument(page, 'item');
		await toggle(page, 'Bulleted list').click();
		await expect(source(page)).toHaveValue('* item');
		await focusEnd(page);
		await toggle(page, 'Numbered list').click();
		await expect(source(page)).toHaveValue('1. item');
		await focusEnd(page);
		await toggle(page, 'Check list').click();
		await expect(source(page)).toHaveValue('* [ ] item');
		await focusEnd(page);
		await toggle(page, 'Check list').click();
		await expect(source(page)).toHaveValue('item');
	});

	test('inserts a thematic break', async ({ page }) => {
		await setDocument(page, 'above');
		await button(page, 'Insert thematic break').click();
		await expect(source(page)).toHaveValue(/above\n\n\*\*\*/);
		await expect(editor(page).locator('hr')).toHaveCount(1);
	});
});

test.describe('lists', () => {
	test('checks a task by clicking it', async ({ page }) => {
		await setDocument(page, '* [ ] task');
		const item = editor(page).getByRole('checkbox');
		await item.click({ position: { x: 8, y: 8 } });
		await expect(source(page)).toHaveValue('* [x] task');
	});

	test('nests items with Tab, and continues them with Enter', async ({ page }) => {
		await setDocument(page, '* one');
		// The import adds an empty paragraph after a list, so go back into the list.
		await editor(page).getByText('one').click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');
		await page.keyboard.type('two');
		await expect(source(page)).toHaveValue('* one\n* two');
		// Like Lexical, Tab indents at the start of an item, and inserts a tab elsewhere.
		await page.keyboard.press('Home');
		await page.keyboard.press('Tab');
		await expect(source(page)).toHaveValue('* one\n  * two');
		await page.keyboard.press('Shift+Tab');
		await expect(source(page)).toHaveValue('* one\n* two');
	});
});

test.describe('markdown shortcuts', () => {
	for (const [typed, expected] of [
		['# Title', '# Title'],
		['### Title', '### Title'],
		['> quote', '> quote'],
		['- item', '* item'],
		['1. item', '1. item'],
		['**bold** ', '**bold**'],
		['*italic* ', '*italic*'],
		['`code` ', '`code`']
	] as const) {
		test(`typing ${typed}`, async ({ page }) => {
			await setDocument(page, '');
			await page.keyboard.type(typed);
			await expect(source(page)).toHaveValue(
				new RegExp(`^${expected.replace(/[*`#>.]/g, '\\$&')}`)
			);
		});
	}

	test('inserts a code block with three backticks', async ({ page }) => {
		await setDocument(page, '');
		await page.keyboard.type('```ts ');
		await expect(page.locator('.cm-editor')).toBeVisible();
		await expect(source(page)).toHaveValue(/^```ts\n```/);
	});

	test('heading keyboard shortcuts', async ({ page }) => {
		await setDocument(page, 'word');
		await page.keyboard.press('ControlOrMeta+Alt+Digit2');
		await expect(source(page)).toHaveValue('## word');
		await focusEnd(page);
		await page.keyboard.press('ControlOrMeta+Alt+Digit0');
		await expect(source(page)).toHaveValue('word');
	});
});

test.describe('links', () => {
	test('creates a link with the dialog', async ({ page }) => {
		await setDocument(page, 'word');
		await selectAll(page);
		await button(page, 'Create link').click();
		await page.getByLabel('URL', { exact: true }).fill('https://svelte.dev');
		await button(page, 'Set URL').click();
		await expect(source(page)).toHaveValue('[word](https://svelte.dev)');
	});

	test('opens the dialog with the keyboard', async ({ page }) => {
		await setDocument(page, 'word');
		await selectAll(page);
		await page.keyboard.press('ControlOrMeta+k');
		await expect(page.getByLabel('URL', { exact: true })).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByLabel('URL', { exact: true })).not.toBeVisible();
	});

	test('previews, edits and removes a link', async ({ page }) => {
		await setDocument(page, '[word](https://svelte.dev)');
		await page.keyboard.press('ArrowLeft');
		const preview = page.getByTestId('link-dialog-preview');
		await expect(preview).toHaveAttribute('href', 'https://svelte.dev');
		await button(page, 'Edit link URL').click();
		await page.getByLabel('URL', { exact: true }).fill('https://lexical.dev');
		await button(page, 'Set URL').click();
		await expect(source(page)).toHaveValue('[word](https://lexical.dev)');
		await button(page, 'Remove link').click();
		await expect(source(page)).toHaveValue('word');
	});

	test('auto-links typed URLs', async ({ page }) => {
		await setDocument(page, '');
		await page.keyboard.type('see https://svelte.dev ok');
		await expect(editor(page).locator('a')).toHaveAttribute('href', 'https://svelte.dev');
	});
});

test.describe('tables', () => {
	const table = '| a | b |\n| - | - |\n| c | d |';

	test('inserts a table and edits a cell', async ({ page }) => {
		await setDocument(page, 'above');
		await button(page, 'Insert Table').click();
		await expect(editor(page).locator('table')).toBeVisible();
		await expect(page.getByTitle('Column menu')).toHaveCount(3);
		const cells = editor(page).locator('table [contenteditable="true"]');
		await cells.first().click();
		await page.keyboard.type('head');
		await page.keyboard.press('Tab');
		await expect(cells.nth(1)).toBeFocused();
		await page.keyboard.type('next');
		await page.keyboard.press('Enter');
		await expect(cells.nth(4)).toBeFocused();
		await page.keyboard.type('below');
		await page.getByRole('heading', { name: 'sveltedown playground' }).click();
		await expect(source(page)).toHaveValue(/\| head +\| next +\|/);
		await expect(source(page)).toHaveValue(/\| +\| below +\|/);
	});

	test('adds and removes columns and rows', async ({ page }) => {
		await setDocument(page, table);
		await page.getByTitle('Column menu').first().click();
		await button(page, 'Insert a column to the left of this one').click();
		await expect(page.getByTitle('Column menu')).toHaveCount(3);
		await page.getByTitle('Row menu').first().click();
		await button(page, 'Insert a row below this one').click();
		await expect(page.getByTitle('Row menu')).toHaveCount(3);
		await page.getByTitle('Row menu').last().click();
		await button(page, 'Delete this row').click();
		await expect(page.getByTitle('Row menu')).toHaveCount(2);
		await page.getByTitle('Column menu').first().click();
		await button(page, 'Delete this column').click();
		await expect(page.getByTitle('Column menu')).toHaveCount(2);
		await expect(source(page)).toHaveValue(/\| a \| b \|/);
	});

	test('aligns a column', async ({ page }) => {
		await setDocument(page, table);
		await page.getByTitle('Column menu').first().click();
		await page.getByRole('radio', { name: 'Align center' }).click();
		await expect(source(page)).toHaveValue(/:-+:/);
	});

	test('deletes the table', async ({ page }) => {
		await setDocument(page, table);
		await button(page, 'Delete table').click();
		await expect(editor(page).locator('table')).toHaveCount(0);
		await expect(source(page)).toHaveValue('');
	});

	test('keeps formatting in cells', async ({ page }) => {
		await setDocument(page, '| **a** | `b` |\n| - | - |\n| [c](https://x.dev) | d |');
		await expect(editor(page).locator('table strong')).toHaveText('a');
		await expect(editor(page).locator('table code')).toHaveText('b');
		await expect(editor(page).locator('table a')).toHaveText('c');
	});
});

test.describe('code blocks', () => {
	test('inserts a code block, edits it, and removes it', async ({ page }) => {
		await setDocument(page, 'above');
		await button(page, 'Insert Code Block').click();
		const code = page.locator('.cm-content').first();
		await expect(code).toBeVisible();
		await code.click();
		await page.keyboard.type('let a = 1;');
		await expect(source(page)).toHaveValue(/```ts\nlet a = 1;\n```/);
		await button(page, 'Delete code block').click();
		await expect(source(page)).toHaveValue('above');
	});

	test('changes the language', async ({ page }) => {
		await setDocument(page, '```ts\nlet a = 1;\n```');
		await page.locator('.sd-code-mirror-toolbar').getByRole('combobox').click();
		await page.getByRole('option', { name: 'JavaScript' }).click();
		await expect(source(page)).toHaveValue(/```js\n/);
	});

	test('highlights code by language', async ({ page }) => {
		await setDocument(page, '```ts\nconst a = "x";\n```');
		await expect(page.locator('.cm-content span').first()).toBeVisible();
	});
});

test.describe('source and diff modes', () => {
	test('edits the source, and comes back to rich text', async ({ page }) => {
		await setDocument(page, 'word');
		await toggle(page, 'Source mode').click();
		const code = page.locator('.sveltedown-source-editor .cm-content');
		await expect(code).toContainText('word');
		await code.click();
		await page.keyboard.press('ControlOrMeta+End');
		await page.keyboard.type('\n\n# Heading');
		await expect(source(page)).toHaveValue('word\n\n# Heading');
		await toggle(page, 'Rich text').click();
		await expect(editor(page).locator('h1')).toHaveText('Heading');
	});

	test('shows the differences in diff mode', async ({ page }) => {
		await setDocument(page, 'changed');
		await toggle(page, 'Diff mode').click();
		await expect(page.locator('.sveltedown-diff-editor .cm-mergeView')).toBeVisible();
		await expect(page.locator('.sveltedown-diff-editor')).toContainText('changed');
		await toggle(page, 'Rich text').click();
		await expect(editor(page)).toContainText('changed');
	});

	test('recovers from a parse error in source mode', async ({ page }) => {
		await source(page).fill('broken <div');
		await expect(page.locator('.sd-markdown-parse-error')).toBeVisible();
		await toggle(page, 'Source mode').click();
		const code = page.locator('.sveltedown-source-editor .cm-content');
		await code.click();
		await page.keyboard.press('ControlOrMeta+a');
		await page.keyboard.type('fixed');
		await toggle(page, 'Rich text').click();
		await expect(page.locator('.sd-markdown-parse-error')).toHaveCount(0);
		await expect(editor(page)).toHaveText('fixed');
		errorsByPage.set(page, []);
	});
});

test.describe('admonitions and directives', () => {
	test('inserts an admonition and edits it', async ({ page }) => {
		await setDocument(page, 'above');
		await page.getByRole('combobox', { name: 'Insert Admonition' }).click();
		await page.getByRole('option', { name: 'Tip' }).click();
		const nested = editor(page).locator('.sd-admonition-tip [contenteditable="true"]');
		await expect(nested).toBeVisible();
		await nested.click();
		await page.keyboard.type('careful');
		await page.getByRole('heading', { name: 'sveltedown playground' }).click();
		await expect(source(page)).toHaveValue(/:::tip\ncareful\n:::/);
	});

	test('changes the admonition type', async ({ page }) => {
		await setDocument(page, ':::note\ntext\n:::');
		await editor(page).locator('.sd-admonition-note [contenteditable="true"]').click();
		await page.getByRole('combobox', { name: 'Admonition type' }).click();
		await page.getByRole('option', { name: 'Danger' }).click();
		await expect(source(page)).toHaveValue(/:::danger\ntext\n:::/);
	});

	test('formats text inside an admonition with the toolbar', async ({ page }) => {
		await setDocument(page, ':::note\nword\n:::');
		const nested = editor(page).locator('.sd-admonition-note [contenteditable="true"]');
		await nested.click();
		await page.keyboard.press('ControlOrMeta+a');
		await toggle(page, 'Bold').click();
		await page.getByRole('heading', { name: 'sveltedown playground' }).click();
		await expect(source(page)).toHaveValue(/:::note\n\*\*word\*\*\n:::/);
	});

	test('shows the code block toolbar while editing code', async ({ page }) => {
		await setDocument(page, '```ts\nlet a;\n```');
		await page.locator('.cm-content').first().click();
		await expect(page.locator('.sd-select-with-label')).toContainText('Code block language');
	});

	test('edits directive attributes', async ({ page }) => {
		await setDocument(page, '::youtube{#abc}\n\nafter');
		await expect(editor(page)).toContainText('youtube');
	});
});

test.describe('front-matter', () => {
	test('inserts and edits front-matter in the dialog', async ({ page }) => {
		await setDocument(page, 'body');
		await button(page, 'Insert frontmatter').click();
		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Key').first().fill('slug');
		await dialog.getByLabel('Value').first().fill('hello');
		await dialog.getByRole('button', { name: 'Add entry' }).click();
		await dialog.getByLabel('Key').nth(1).fill('draft');
		await dialog.getByLabel('Value').nth(1).fill('yes');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(source(page)).toHaveValue(/^---\nslug: hello\ndraft: 'yes'\n---\n\nbody/);
		await expect(button(page, 'Edit frontmatter')).toBeVisible();
	});

	test('keeps unchanged yaml, comments included', async ({ page }) => {
		await setDocument(page, '---\n# comment\na: 1\n---\n\nbody');
		await button(page, 'Edit frontmatter').click();
		await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
		await expect(source(page)).toHaveValue(/# comment/);
	});
});

test.describe('images', () => {
	test('inserts an image from a URL', async ({ page }) => {
		await setDocument(page, 'above');
		await button(page, 'Insert image').click();
		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Or add an image from an URL:').fill('/favicon.svg');
		await dialog.getByLabel('Alt:').fill('logo');
		await dialog.getByLabel('Title:').fill('Logo');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(source(page)).toHaveValue(/!\[logo\]\(\/favicon.svg "Logo"\)/);
		await expect(editor(page).locator('img')).toHaveAttribute('alt', 'logo');
	});

	test('uploads a file', async ({ page }) => {
		await setDocument(page, 'above');
		await button(page, 'Insert image').click();
		await page
			.getByRole('dialog')
			.getByLabel('Upload an image from your device:')
			.setInputFiles({
				name: 'dot.gif',
				mimeType: 'image/gif',
				buffer: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
			});
		await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
		await expect(source(page)).toHaveValue(/!\[\]\(data\\?:image\/gif/);
	});

	test('edits and deletes an image', async ({ page }) => {
		await setDocument(page, '![old](/favicon.svg)');
		await expect(editor(page).locator('img')).toBeVisible();
		await button(page, 'Edit image').click();
		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Alt:').fill('new');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(source(page)).toHaveValue('![new](/favicon.svg)');
		await button(page, 'Delete image').click();
		await expect(source(page)).toHaveValue('');
	});

	test('resizes an image', async ({ page }) => {
		await setDocument(page, '![logo](/favicon.svg)');
		const image = editor(page).locator('img');
		await image.click();
		const handle = page.locator('.sd-image-resizer-se');
		await expect(handle).toBeVisible();
		const box = (await handle.boundingBox())!;
		await page.mouse.move(box.x + 3, box.y + 3);
		await page.mouse.down();
		await page.mouse.move(box.x + 120, box.y + 120, { steps: 4 });
		await page.mouse.up();
		await expect(source(page)).toHaveValue(/<img .*width=/);
	});
});

test.describe('JSX', () => {
	test('edits properties of a component', async ({ page }) => {
		await setDocument(page, 'A <MyLeaf foo="one">leaf</MyLeaf> here');
		await page.locator('.sd-inline-editor .sd-icon-button').click();
		await page.getByLabel('foo').fill('two');
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(source(page)).toHaveValue(/foo="two"/);
		// The descriptor's source adds the import.
		await expect(source(page)).toHaveValue(/import \{ MyLeaf \} from '.\/external'/);
	});

	test('edits content of a block component', async ({ page }) => {
		await setDocument(page, '<BlockNode>\n  inner\n</BlockNode>');
		await editor(page).locator('.sd-block-editor [contenteditable="true"]').click();
		await page.keyboard.press('End');
		await page.keyboard.type(' text');
		await page.getByRole('heading', { name: 'sveltedown playground' }).click();
		await expect(source(page)).toHaveValue(/inner text/);
	});
});

test.describe('read-only mode', () => {
	test('blocks editing everywhere', async ({ page }) => {
		await setDocument(page, 'word\n\n```ts\nlet a;\n```');
		await page.getByLabel('Read-only').check();
		await expect(editor(page)).toHaveAttribute('contenteditable', 'false');
		// Like MDXEditor, the read-only toolbar is inert rather than disabled.
		await expect(page.locator('.sveltedown-toolbar')).toHaveClass(/sd-read-only-toolbar-root/);
		await expect(page.locator('.sveltedown-toolbar')).toHaveCSS('pointer-events', 'none');
	});
});

test.describe('theme', () => {
	test('data-theme overrides the system preference', async ({ page }) => {
		await page.getByLabel('Theme').selectOption('dark');
		await expect(page.locator('.sveltedown')).toHaveCSS('background-color', 'rgb(17, 17, 19)');
		await page.getByLabel('Theme').selectOption('light');
		await expect(page.locator('.sveltedown')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
	});

	test.describe('in dark mode', () => {
		test.use({ colorScheme: 'dark' });

		test('paints its own dark surface', async ({ page }) => {
			await expect(page.locator('.sveltedown')).toHaveCSS('background-color', 'rgb(17, 17, 19)');
		});
	});
});
