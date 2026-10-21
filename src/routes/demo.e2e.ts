import { expect, test, type Page } from '@playwright/test';

/** Collects uncaught exceptions (e.g. CodeMirror RangeErrors) and console errors. */
function trackErrors(page: Page) {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	return errors;
}

const editor = (page: Page) => page.locator('.cm-content');
const source = (page: Page) => page.locator('textarea');

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.cm-md-image img')).toBeVisible();
});

test('server-renders the page and editor container', async ({ request }) => {
	const response = await request.get('/');
	expect(response.ok()).toBe(true);
	const html = await response.text();
	expect(html).toContain('class="sveltedown');
	expect(html).toContain('sveltedown playground');
});

test('survives fast typing, select-all and delete without errors', async ({ page }) => {
	const errors = trackErrors(page);
	await editor(page).click();
	await page.keyboard.press('ControlOrMeta+End');
	await page.keyboard.type(
		'\n# Heading\n\n![logo](/favicon.svg) **bold** `code`\n\n- [ ] task\n\n---\n'
	);
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.press('Delete');
	await expect(source(page)).toHaveValue('');

	await page.keyboard.type('# Again\n\n```js\nlet x = 1;\n```\n\n![logo](/favicon.svg)\n');
	for (let i = 0; i < 10; i++) await page.keyboard.press('ControlOrMeta+z');
	for (let i = 0; i < 5; i++) await page.keyboard.press('ControlOrMeta+Shift+z');
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.press('Backspace');
	await expect(source(page)).toHaveValue('');
	expect(errors).toEqual([]);
});

test('reveals bold markers at the cursor and hides them away from it', async ({ page }) => {
	const line = page.locator('.cm-line', { hasText: 'Markdown editor for' });
	await expect(line).toContainText('A live-preview Markdown');

	await page.locator('.cm-md-strong', { hasText: 'live-preview' }).click();
	await expect(line).toContainText('A **live-preview** Markdown');

	await page.keyboard.press('ControlOrMeta+End');
	await expect(line).toContainText('A live-preview Markdown');
});

test('toggling a checkbox updates the Markdown', async ({ page }) => {
	await page.getByRole('checkbox', { name: 'Mark task as done' }).click();
	await expect(source(page)).toHaveValue(/- \[x\] Ship it/);
	await page.getByRole('checkbox', { name: 'Mark task as not done' }).last().click();
	await expect(source(page)).toHaveValue(/- \[ \] Ship it/);
});

test('applies updates made outside the editor', async ({ page }) => {
	await page.getByRole('button', { name: 'Clear' }).click();
	await expect(page.locator('.cm-placeholder')).toHaveText('Start writing…');

	// The editor's cursor sits on this line (the doc was empty), so `## ` stays revealed.
	await source(page).fill('## From the textarea');
	await expect(page.locator('.cm-md-h2')).toHaveText('## From the textarea');

	await page.getByRole('button', { name: 'Reset' }).click();
	await expect(page.locator('.cm-md-h1')).toContainText('Welcome to sveltedown');
});

test('switches theme and read-only mode', async ({ page }) => {
	await page.getByLabel('Theme').selectOption('dark');
	await expect(page.locator('.cm-editor')).toHaveCSS('background-color', 'rgb(13, 17, 23)');
	await page.getByLabel('Theme').selectOption('light');
	await expect(page.locator('.cm-editor')).toHaveCSS('background-color', 'rgb(255, 255, 255)');

	await page.getByLabel('Read-only').check();
	await expect(editor(page)).toHaveAttribute('contenteditable', 'false');
	const before = await source(page).inputValue();
	await page.getByRole('checkbox', { name: 'Mark task as done' }).click();
	await expect(source(page)).toHaveValue(before);
});

test('renders a custom image snippet', async ({ page }) => {
	await page.getByLabel('Custom image snippet').check();
	await expect(page.locator('figure figcaption')).toHaveText('Click the image to edit its source');
});
