import { expect, test, type Page } from '@playwright/test';

/** Collects uncaught exceptions and console errors. */
function trackErrors(page: Page) {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	return errors;
}

const editor = (page: Page) => page.getByRole('textbox', { name: 'editable markdown' });
const source = (page: Page) => page.getByRole('textbox', { name: 'Markdown', exact: true });

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await expect(editor(page)).toBeVisible();
});

test('server-renders the page and editor container', async ({ request }) => {
	const response = await request.get('/');
	expect(response.ok()).toBe(true);
	const html = await response.text();
	expect(html).toContain('class="sveltedown');
	expect(html).toContain('sveltedown playground');
});

test('typing updates the bound markdown', async ({ page }) => {
	const errors = trackErrors(page);
	await editor(page).click();
	await page.keyboard.press('ControlOrMeta+End');
	await page.keyboard.type('More text');
	await expect(source(page)).toHaveValue(/More text/);
	expect(errors).toEqual([]);
});

test('the bound markdown updates the editor', async ({ page }) => {
	const errors = trackErrors(page);
	await source(page).fill('Some **new** text');
	await expect(editor(page)).toHaveText('Some new text');
	await expect(editor(page).locator('strong')).toHaveText('new');
	expect(errors).toEqual([]);
});

test('survives select-all and delete', async ({ page }) => {
	const errors = trackErrors(page);
	await editor(page).click();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.press('Delete');
	await expect(source(page)).toHaveValue('');
	await page.keyboard.type('Again');
	await expect(source(page)).toHaveValue('Again');
	expect(errors).toEqual([]);
});

test('formats with the keyboard and undoes it', async ({ page }) => {
	await editor(page).click();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.type('word');
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.press('ControlOrMeta+b');
	await expect(source(page)).toHaveValue('**word**');
	await page.keyboard.press('ControlOrMeta+z');
	await expect(source(page)).toHaveValue('word');
});

test.describe('in dark mode', () => {
	test.use({ colorScheme: 'dark' });

	test('paints its own dark surface, so text stays readable on a light page', async ({ page }) => {
		const colors = await page.locator('.sveltedown').evaluate((element) => {
			const style = getComputedStyle(element);
			return { background: style.backgroundColor, color: style.color };
		});
		expect(colors.background).toBe('rgb(17, 17, 19)');
		expect(colors.color).not.toBe(colors.background);
	});
});

test('data-theme overrides the system preference', async ({ page }) => {
	await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
	await expect(page.locator('.sveltedown')).toHaveCSS('background-color', 'rgb(17, 17, 19)');
	await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
	await expect(page.locator('.sveltedown')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});
