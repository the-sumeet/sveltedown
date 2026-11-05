import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { MarkdownEditor, markdown$, maxLengthPlugin } from '#lib';
import RemoteRealmHarness, { remote } from './fixtures/RemoteRealmHarness.svelte';
import { expectSoon } from './dom.js';

describe('maxLengthPlugin', () => {
	it('stops typing beyond the maximum length', async () => {
		const { component } = await render(MarkdownEditor, {
			markdown: 'abc',
			plugins: [maxLengthPlugin(5)]
		});
		const editor = page.getByRole('textbox', { name: 'editable markdown' });
		await userEvent.click(editor);
		await userEvent.keyboard('{End}defgh');
		await expectSoon(() => component.getMarkdown() === 'abcde');
		expect(component.getMarkdown()).toBe('abcde');
	});
});

describe('remoteRealmPlugin', () => {
	it('gives components outside the editor access to its realm', async () => {
		remote.realm = undefined;
		await render(RemoteRealmHarness);
		await expectSoon(() => remote.realm !== undefined);
		expect(remote.realm!.getValue(markdown$)).toBe('remote');
		await expect.element(page.getByLabelText('Remote markdown')).toHaveTextContent('remote');
	});
});
