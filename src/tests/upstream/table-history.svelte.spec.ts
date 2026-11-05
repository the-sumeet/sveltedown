// Ported from upstream's src/test/table-history.test.tsx.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { getPeerDependencyFromEditor } from '@lexical/extension';
import { HistoryExtension } from '@lexical/history';
// Svelte modules reserve the `$` prefix, so Lexical's `$` functions are used through the namespace.
import * as lexical from 'lexical';
import type { LexicalEditor } from 'lexical';
import { tablePlugin, type MarkdownEditorMethods } from '#lib';
import ToolbarEditor from '../fixtures/ToolbarEditor.svelte';
import UndoRedoToolbar from '../fixtures/UndoRedoToolbar.svelte';
import { expectSoon } from '../dom.js';

const table = '| a | b |\n| - | - |\n| c | d |';

// Upstream runs these tests in jsdom, where the history's DOM selection updates never move
// focus between cell editors. In a browser they do, and each resulting blur saves a cell, which
// adds root history entries the tests don't expect. Stubbing the selection keeps jsdom semantics.
const selectionMethods = ['setBaseAndExtent', 'addRange', 'collapse', 'removeAllRanges'] as const;
const originals = new Map<string, PropertyDescriptor>();

beforeAll(() => {
	for (const name of selectionMethods) {
		originals.set(name, Object.getOwnPropertyDescriptor(Selection.prototype, name)!);
		Object.defineProperty(Selection.prototype, name, {
			configurable: true,
			value: () => undefined
		});
	}
});

afterAll(() => {
	for (const [name, descriptor] of originals) {
		Object.defineProperty(Selection.prototype, name, descriptor);
	}
});

async function setup(markdown = table, seedParent = true) {
	const props = $state({
		markdown,
		plugins: [tablePlugin()],
		toolbar: UndoRedoToolbar,
		editor: undefined as MarkdownEditorMethods | undefined
	});
	const view = await render(ToolbarEditor, props);
	const cells = () =>
		Array.from(view.container.querySelectorAll<HTMLElement>('tbody [contenteditable="true"]'));
	await expectSoon(() => cells().length >= 4 && props.editor !== undefined);
	const editor = (index: number) =>
		(cells()[index] as HTMLElement & { __lexicalEditor: LexicalEditor }).__lexicalEditor;
	const parent = editor(0)._parentEditor!;
	let root = parent;
	while (root._parentEditor) root = root._parentEditor;
	if (seedParent) {
		parent.update(() => lexical.$getRoot().selectEnd(), {
			discrete: true,
			tag: 'skip-dom-selection'
		});
	}
	return { ...view, markdown: () => props.editor!.getMarkdown(), cells, editor, parent, root };
}

function history(editor: LexicalEditor) {
	return getPeerDependencyFromEditor<typeof HistoryExtension>(editor, HistoryExtension.name)!.output
		.historyState.value;
}

function command(editor: LexicalEditor, redo = false) {
	editor.dispatchCommand(redo ? lexical.REDO_COMMAND : lexical.UNDO_COMMAND, undefined);
}

function type(editor: LexicalEditor, text: string) {
	editor.update(() => lexical.$getRoot().selectEnd(), { discrete: true });
	editor.update(
		() => {
			lexical.$getRoot().getLastDescendant()!.insertAfter(lexical.$createTextNode(text));
		},
		{ discrete: true, tag: lexical.HISTORY_PUSH_TAG }
	);
}

function blur(editor: LexicalEditor) {
	editor.dispatchCommand(lexical.BLUR_COMMAND, new FocusEvent('blur', { relatedTarget: null }));
}

describe('table persisted-content reconciliation', () => {
	it('restores mounted cells and Markdown after ordinary edit, blur, Undo and Redo', async () => {
		const { cells, editor, parent, root, markdown } = await setup();
		const before = markdown();
		const mounted = editor(2);
		type(mounted, ' edited');
		blur(mounted);
		await expectSoon(() => markdown().includes('c edited'));
		const edited = markdown();
		expect(history(parent).undoStack).toHaveLength(1);
		command(root);
		await expectSoon(() => cells()[2].textContent === 'c' && markdown() === before);
		expect(history(parent).redoStack).toHaveLength(1);
		blur(editor(2));
		expect(markdown()).toBe(before);
		expect(history(parent).redoStack).toHaveLength(1);
		command(root, true);
		await expectSoon(() => cells()[2].textContent === 'c edited' && markdown() === edited);
	});

	it('preserves unsaved sibling typing and local history during reconciliation', async () => {
		const { cells, editor, root } = await setup();
		type(editor(2), ' committed');
		blur(editor(2));
		const sibling = editor(0);
		type(sibling, ' pending');
		command(root);
		await expectSoon(() => cells()[2].textContent === 'c');
		expect(cells()[0].textContent).toBe('a pending');
		expect(editor(0)).toBe(sibling);
		command(sibling);
		await expectSoon(() => cells()[0].textContent === 'a');
		command(sibling, true);
		await expectSoon(() => cells()[0].textContent === 'a pending');
		command(root, true);
		await expectSoon(() => cells()[2].textContent === 'c committed');
		expect(cells()[0].textContent).toBe('a pending');
		expect(editor(0)).toBe(sibling);
	});

	it('does not overwrite parent history availability while clearing a restored cell', async () => {
		const { cells, editor, root } = await setup('before\n\n' + table);
		root.update(
			() => {
				const text = lexical.$getRoot().getFirstDescendant();
				if (lexical.$isTextNode(text)) text.setTextContent('changed');
			},
			{ discrete: true, tag: lexical.HISTORY_PUSH_TAG }
		);
		type(editor(2), ' committed');
		blur(editor(2));
		const cellAvailability: boolean[] = [];
		const undoAvailability: boolean[] = [];
		const redoAvailability: boolean[] = [];
		const removers = [
			editor(2).registerCommand(
				lexical.CAN_UNDO_COMMAND,
				(value) => {
					cellAvailability.push(value);
					return false;
				},
				lexical.COMMAND_PRIORITY_CRITICAL
			),
			root.registerCommand(
				lexical.CAN_UNDO_COMMAND,
				(value) => {
					undoAvailability.push(value);
					return false;
				},
				lexical.COMMAND_PRIORITY_CRITICAL
			),
			root.registerCommand(
				lexical.CAN_REDO_COMMAND,
				(value) => {
					redoAvailability.push(value);
					return false;
				},
				lexical.COMMAND_PRIORITY_CRITICAL
			)
		];
		command(root);
		await expectSoon(() => cells()[2].textContent === 'c');
		expect(history(root).undoStack.length).toBeGreaterThan(0);
		expect(history(root).redoStack.length).toBeGreaterThan(0);
		expect(undoAvailability).not.toContain(false);
		expect(redoAvailability.at(-1)).toBe(true);
		expect(cellAvailability).toContain(false);
		for (const remove of removers) remove();
	});

	it('does not let a retained blur overwrite an authoritative parent Undo before reconciliation', async () => {
		const { cells, editor, root, markdown } = await setup();
		const before = markdown();
		type(editor(2), ' committed');
		blur(editor(2));
		root.dispatchCommand(lexical.UNDO_COMMAND, undefined);
		root.update(() => undefined, { discrete: true });
		editor(2).dispatchCommand(
			lexical.BLUR_COMMAND,
			new FocusEvent('blur', { relatedTarget: null })
		);
		await expectSoon(() => cells()[2].textContent === 'c' && markdown() === before);
		expect(markdown()).toBe(before);
	});
});
