import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { MarkdownEditor, rootEditor$, type Realm, type RealmPlugin } from '#lib';
import { UNDO_COMMAND, REDO_COMMAND } from 'lexical';
import { calloutPlugin } from './fixtures/calloutPlugin.js';

const markdown = 'before\n\n<Callout>\n  inner **text**\n</Callout>\n\nafter';

function renderEditor(onchange = vi.fn()) {
	let realm!: Realm;
	const capture: RealmPlugin = {
		postInit: (r) => {
			realm = r;
		}
	};
	return render(MarkdownEditor, {
		markdown,
		onchange,
		plugins: [calloutPlugin(), capture]
	}).then((result) => ({ ...result, realm, onchange }));
}

const nested = () => page.getByTestId('callout').getByRole('textbox');
const root = () => page.getByRole('textbox', { name: 'editable markdown' });

// The go/no-go check of the Svelte decorator bridge: everything with nested content builds on it.
describe('decorator with a nested Lexical editor', () => {
	it('renders the Svelte decorator, with formatted content in a nested editor', async () => {
		await renderEditor();
		await expect.element(nested()).toHaveTextContent('inner text');
		expect(nested().element().querySelector('strong')).not.toBeNull();
		expect(nested().element().getAttribute('contenteditable')).toBe('true');
	});

	it('round-trips the markdown unchanged', async () => {
		const { component } = await renderEditor();
		await expect.element(nested()).toBeVisible();
		expect(component.getMarkdown().trim()).toBe(markdown);
	});

	it('saves typing into the markdown when the nested editor loses focus', async () => {
		const { component, onchange } = await renderEditor();
		await userEvent.click(nested());
		await userEvent.keyboard('{End}!');
		await expect.element(nested()).toHaveTextContent('inner text!');
		await userEvent.click(page.getByText('after'));
		await vi.waitFor(() => expect(component.getMarkdown()).toContain('inner **text!**'));
		expect(onchange).toHaveBeenLastCalledWith(component.getMarkdown(), false);
	});

	it('undoes and redoes nested typing through the shared history', async () => {
		const { realm } = await renderEditor();
		await userEvent.click(nested());
		await userEvent.keyboard('{End}!');
		await expect.element(nested()).toHaveTextContent('inner text!');

		const editor = realm.getValue(rootEditor$)!;
		editor.dispatchCommand(UNDO_COMMAND, undefined);
		await expect.element(nested()).toHaveTextContent(/^inner text$/);
		editor.dispatchCommand(REDO_COMMAND, undefined);
		await expect.element(nested()).toHaveTextContent('inner text!');
	});

	it('undoes with the keyboard from inside the nested editor', async () => {
		await renderEditor();
		await userEvent.click(nested());
		await userEvent.keyboard('{End}!');
		await expect.element(nested()).toHaveTextContent('inner text!');
		await userEvent.keyboard('{Control>}z{/Control}{Meta>}z{/Meta}');
		await expect.element(nested()).toHaveTextContent(/^inner text$/);
	});

	it('removes the node when backspacing in an empty nested editor', async () => {
		const { component } = await render(MarkdownEditor, {
			markdown: 'before\n\n<Callout>\n</Callout>\n\nafter',
			plugins: [calloutPlugin()]
		});
		await userEvent.click(nested());
		await userEvent.keyboard('{Backspace}');
		await expect.element(page.getByTestId('callout')).not.toBeInTheDocument();
		await vi.waitFor(() => expect(component.getMarkdown().trim()).toBe('before\n\nafter'));
	});

	it('unmounts the decorator when the node goes away', async () => {
		const { component } = await renderEditor();
		await expect.element(nested()).toBeVisible();
		component.setMarkdown('only text');
		await expect.element(root()).toHaveTextContent('only text');
		await expect.element(page.getByTestId('callout')).not.toBeInTheDocument();
	});
});
