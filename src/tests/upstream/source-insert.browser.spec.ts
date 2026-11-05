// Condensed port of upstream's src/test/source-insert-markdown.test.tsx: the core contract of
// insertMarkdown and setMarkdown in the source and diff modes.
import { describe, expect, it, vi } from 'vitest';
import { redo, undo } from '@codemirror/commands';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { $getRoot } from 'lexical';
import { diffSourcePlugin, rootEditor$, viewMode$, type Realm } from '#lib';
import { renderEditor } from '../helpers.js';
import { expectSoon } from '../dom.js';

async function setup(
	mode: 'source' | 'diff',
	markdown = 'Original rich text',
	startInMode = false
) {
	const onchange = vi.fn();
	let realm!: Realm;
	const result = await renderEditor({
		markdown,
		onchange,
		plugins: [
			diffSourcePlugin({
				diffMarkdown: 'Unchanged comparison',
				viewMode: startInMode ? mode : 'rich-text'
			}),
			{ init: (r: Realm) => (realm = r) }
		]
	});
	realm.getValue(rootEditor$)!.update(() => $getRoot().selectEnd(), { discrete: true });
	realm.pub(viewMode$, mode);
	const getView = () => {
		const content = result.container.querySelector<HTMLElement>(
			'.sveltedown-source-editor .cm-content, .cm-merge-b .cm-content'
		);
		return content ? EditorView.findFromDOM(content) : null;
	};
	await expectSoon(() => getView() !== null);
	return { ...result, realm, onchange, view: () => getView()! };
}

describe.each(['source', 'diff'] as const)('insertMarkdown in %s mode', (mode) => {
	it('preserves source edits and inserts at the CodeMirror cursor', async () => {
		const { component, view, onchange } = await setup(mode);
		view().dispatch({
			changes: { from: 0, to: view().state.doc.length, insert: 'Edited content' },
			selection: { anchor: 7 }
		});
		expect(component.getMarkdown()).toBe('Edited content');
		onchange.mockClear();
		component.insertMarkdown('new ');
		expect(component.getMarkdown()).toBe('Edited new content');
		expect(view().state.doc.toString()).toBe('Edited new content');
		expect(view().state.selection.main.head).toBe(11);
		expect(onchange).toHaveBeenCalledTimes(1);
		expect(onchange).toHaveBeenLastCalledWith('Edited new content', false);
	});

	it('replaces the selection and preserves native undo and redo', async () => {
		const { component, view } = await setup(mode);
		view().dispatch({ selection: { anchor: 9, head: 13 } });
		component.insertMarkdown('source');
		expect(component.getMarkdown()).toBe('Original source text');
		expect(view().state.selection.main.head).toBe(15);
		expect(undo(view())).toBe(true);
		expect(component.getMarkdown()).toBe('Original rich text');
		expect(redo(view())).toBe(true);
		expect(component.getMarkdown()).toBe('Original source text');
	});

	it('inserts at each CodeMirror selection and supports consecutive calls', async () => {
		const { component, view } = await setup(mode, 'one two');
		view().dispatch({
			selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(4)])
		});
		component.insertMarkdown('A');
		component.insertMarkdown('B');
		expect(component.getMarkdown()).toBe('ABone ABtwo');
		expect(view().state.selection.ranges.map(({ head }) => head)).toEqual([2, 8]);
	});

	it('keeps raw source syntax and whitespace without importing it into Lexical', async () => {
		const { component, view } = await setup(mode, '');
		component.insertMarkdown('  <unfinished>\n\n');
		expect(component.getMarkdown()).toBe('  <unfinished>\n\n');
		expect(view().state.doc.toString()).toBe('  <unfinished>\n\n');
	});

	it('synchronizes edits back to rich text when the mode changes', async () => {
		const { component, view, realm, container } = await setup(mode);
		view().dispatch({
			changes: { from: 0, to: view().state.doc.length, insert: 'Edited content' }
		});
		component.insertMarkdown('New ');
		realm.pub(viewMode$, 'rich-text');
		await expectSoon(() => container.textContent?.includes('New Edited content') ?? false);
		expect(component.getMarkdown()).toBe('New Edited content');
	});

	it('supports an editor that starts in the mode, and external setMarkdown', async () => {
		const { component, view } = await setup(mode, 'start', true);
		component.setMarkdown('  raw   *markdown*  ');
		expect(component.getMarkdown()).toBe('  raw   *markdown*  ');
		expect(view().state.doc.toString()).toBe('  raw   *markdown*  ');
	});
});

describe('insertMarkdown in rich-text mode', () => {
	it('continues inserting into the Lexical selection', async () => {
		const { component, realm } = await renderEditor({ markdown: 'Start' }).then(async (result) => ({
			...result,
			realm: result.realm
		}));
		realm.getValue(rootEditor$)!.update(() => $getRoot().selectEnd(), { discrete: true });
		component.insertMarkdown(' *more*');
		await expectSoon(() => component.getMarkdown().startsWith('Start'));
		expect(component.getMarkdown()).toContain('*more*');
	});
});
