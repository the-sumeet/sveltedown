// Ported from upstream's src/test/undo-redo.test.tsx and table.test.tsx.
import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { getPeerDependencyFromEditor } from '@lexical/extension';
import { HistoryExtension } from '@lexical/history';
// Svelte modules reserve the `$` prefix, so Lexical's `$` functions are used through the namespace.
import * as lexical from 'lexical';
import type { LexicalEditor } from 'lexical';
import {
	AdmonitionDirectiveDescriptor,
	GenericJsxEditor,
	NESTED_EDITOR_UPDATED_COMMAND,
	activeEditor$,
	directivesPlugin,
	editorInFocus$,
	jsxPlugin,
	rootEditor$,
	tablePlugin,
	type MarkdownEditorMethods,
	type Realm
} from '#lib';
import { createExtensionEditor } from '../../lib/plugins/core/lexicalExtensions.js';
import ToolbarEditor from '../fixtures/ToolbarEditor.svelte';
import ConditionalUndoToolbar from '../fixtures/ConditionalUndoToolbar.svelte';
import { expectSoon } from '../dom.js';

async function renderConditionalToolbar(suppressSharedHistory = false) {
	let realm!: Realm;
	let editor!: LexicalEditor;
	const props = $state({
		markdown: 'Initial',
		suppressSharedHistory,
		toolbar: ConditionalUndoToolbar,
		editor: undefined as MarkdownEditorMethods | undefined,
		plugins: [
			{
				postInit: (r: Realm) => {
					realm = r;
					editor = r.getValue(rootEditor$)!;
				}
			}
		]
	});
	await render(ToolbarEditor, props);
	await expect.element(undo()).toBeInTheDocument();

	const remount = async () => {
		const rootNode = editor.getEditorState().read(() => lexical.$getRoot());
		realm.pub(editorInFocus$, { editorType: 'codeblock', rootNode, editorRef: null });
		await expect.element(undo()).not.toBeInTheDocument();
		realm.pub(editorInFocus$, { editorType: 'lexical', rootNode, editorRef: editor });
		await expect.element(undo()).toBeInTheDocument();
	};

	const edit = () => {
		editor.update(() => lexical.$getRoot().getFirstChildOrThrow().selectEnd(), { discrete: true });
		editor.update(
			() => {
				const paragraph = lexical.$getRoot().getFirstChildOrThrow();
				if (!lexical.$isParagraphNode(paragraph)) throw new Error('Expected a paragraph');
				paragraph.append(lexical.$createTextNode(' edit'));
			},
			{ discrete: true, tag: lexical.HISTORY_PUSH_TAG }
		);
	};

	return { realm, editor, props, remount, edit };
}

const undo = () => page.getByRole('radio', { name: /Undo/ });
const redo = () => page.getByRole('radio', { name: /Redo/ });

describe('UndoRedo lifecycle', () => {
	it('restores undo and redo availability when conditional toolbar contents remount', async () => {
		const { props, remount, edit } = await renderConditionalToolbar();
		await expect.element(undo()).toBeDisabled();
		await expect.element(redo()).toBeDisabled();
		edit();
		await expect.element(undo()).toBeEnabled();
		await remount();
		await expect.element(undo()).toBeEnabled();
		await expect.element(redo()).toBeDisabled();
		(undo().element() as HTMLElement).click();
		await expectSoon(() => props.editor!.getMarkdown() === 'Initial');
		await remount();
		await expect.element(undo()).toBeDisabled();
		await expect.element(redo()).toBeEnabled();
		(redo().element() as HTMLElement).click();
		await expectSoon(() => props.editor!.getMarkdown() === 'Initial edit');
	});

	it.each([false, true])(
		'keeps an unchanged document disabled after remount (history suppressed: %s)',
		async (suppressed) => {
			const { remount } = await renderConditionalToolbar(suppressed);
			await remount();
			await expect.element(undo()).toBeDisabled();
			await expect.element(redo()).toBeDisabled();
		}
	);

	it('reads the active editor history instead of retaining another editor availability', async () => {
		const { realm, editor, edit } = await renderConditionalToolbar();
		edit();
		await expect.element(undo()).toBeEnabled();
		const local = createExtensionEditor({
			name: 'undo-redo-local',
			namespace: 'undo-redo-local',
			nodes: [],
			historyMode: 'table-local'
		});
		const noHistory = createExtensionEditor({
			name: 'undo-redo-none',
			namespace: 'undo-redo-none',
			nodes: [],
			historyMode: 'none'
		});
		try {
			for (const activeEditor of [local, noHistory, null]) {
				realm.pub(activeEditor$, activeEditor);
				await expect.element(undo()).toBeDisabled();
				await expect.element(redo()).toBeDisabled();
			}
			realm.pub(activeEditor$, editor);
			await expect.element(undo()).toBeEnabled();
			await expect.element(redo()).toBeDisabled();
		} finally {
			local.dispose();
			noHistory.dispose();
		}
	});
});

async function expectSaveAddsOneUndoStep(
	markdown: string,
	plugins: never[],
	selector: string,
	trigger: string
) {
	let rootEditor!: LexicalEditor;
	const props = $state({
		markdown,
		editor: undefined as MarkdownEditorMethods | undefined,
		plugins: [
			{ postInit: (realm: Realm) => (rootEditor = realm.getValue(rootEditor$)!) },
			...plugins
		]
	});
	const { container } = await render(ToolbarEditor, props);
	await expectSoon(() => container.querySelector(selector) !== null);
	const history = getPeerDependencyFromEditor<typeof HistoryExtension>(
		rootEditor,
		HistoryExtension.name
	)!.output.historyState.value;
	const element = container.querySelector<HTMLElement>(selector)!;
	const nested = (element as HTMLElement & { __lexicalEditor: LexicalEditor }).__lexicalEditor;
	const save = () => {
		if (trigger === 'blur') {
			element.dispatchEvent(new FocusEvent('blur', { relatedTarget: null }));
		} else {
			nested.dispatchCommand(NESTED_EDITOR_UPDATED_COMMAND, undefined);
		}
	};

	// History only pushes the previous state once it has recorded one.
	rootEditor.update(
		() =>
			lexical
				.$getRoot()
				.append(lexical.$createParagraphNode().append(lexical.$createTextNode('after'))),
		{
			discrete: true
		}
	);
	const undoDepth = history.undoStack.length;
	save();
	expect(history.undoStack).toHaveLength(undoDepth);

	nested.update(
		() => {
			const paragraph = lexical.$getRoot().getFirstChildOrThrow();
			if (!lexical.$isParagraphNode(paragraph)) throw new Error('Expected a paragraph');
			paragraph.append(lexical.$createTextNode('x'));
		},
		{ discrete: true }
	);
	const editedDepth = history.undoStack.length;
	save();
	expect(history.undoStack.length).toBe(editedDepth + 1);
	return props.editor!.getMarkdown();
}

describe('nested editor saves', () => {
	it.each([
		['directive', 'blur', ':::info\nhello\n:::'],
		['directive', 'nested editor update', ':::info\nhello\n:::'],
		['jsx', 'blur', '<Grid>\n  hello\n</Grid>'],
		['jsx', 'nested editor update', '<Grid>\n  hello\n</Grid>']
	])(
		'adds a root Undo step only when the %s content changed (%s)',
		async (_kind, trigger, markdown) => {
			const result = await expectSaveAddsOneUndoStep(
				markdown,
				[
					directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
					jsxPlugin({
						jsxComponentDescriptors: [
							{ name: 'Grid', kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor }
						]
					})
				] as never[],
				'.sd-nested-editor',
				trigger
			);
			expect(result).toContain('hellox');
		}
	);

	it.each(['blur', 'nested editor update'])(
		'adds a root Undo step only when a table cell changed (%s)',
		async (trigger) => {
			const result = await expectSaveAddsOneUndoStep(
				'| a | b |\n| - | - |\n| c | d |',
				[tablePlugin()] as never[],
				'tbody td [contenteditable="true"]',
				trigger
			);
			expect(result).toContain('| cx |');
		}
	);
});
