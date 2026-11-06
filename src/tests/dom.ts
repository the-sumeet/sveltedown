import type { page } from 'vitest/browser';

/** Sets an input's value the way typing does, so `bind:value` sees it. */
export function setValue(element: Element, value: string) {
	const input = element as HTMLInputElement;
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** The element of a locator, once it exists. */
export async function find(locator: ReturnType<typeof page.getByRole>): Promise<HTMLElement> {
	await expectSoon(() => locator.query() !== null);
	return locator.element() as HTMLElement;
}

/** Waits until the check holds. */
export async function expectSoon(check: () => boolean, timeout = 2000) {
	const start = Date.now();
	while (!check()) {
		if (Date.now() - start > timeout) throw new Error('Timed out waiting for condition');
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
}
