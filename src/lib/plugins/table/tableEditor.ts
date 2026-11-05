import { mergeRegister } from '@lexical/utils';
import {
	$createParagraphNode,
	$getNodeByKey,
	$getRoot,
	$getSelection,
	$isElementNode,
	$isRangeSelection,
	$isRootNode,
	BLUR_COMMAND,
	CAN_REDO_COMMAND,
	CAN_UNDO_COMMAND,
	CLEAR_HISTORY_COMMAND,
	COMMAND_PRIORITY_CRITICAL,
	COMMAND_PRIORITY_EDITOR,
	COMMAND_PRIORITY_LOW,
	DELETE_CHARACTER_COMMAND,
	DELETE_LINE_COMMAND,
	DELETE_WORD_COMMAND,
	FOCUS_COMMAND,
	HISTORIC_TAG,
	KEY_ENTER_COMMAND,
	KEY_TAB_COMMAND,
	SKIP_DOM_SELECTION_TAG,
	type LexicalEditor,
	type LexicalEditorWithDispose,
	type LexicalNode,
	type NodeKey
} from 'lexical';
import type * as Mdast from 'mdast';
import { exportLexicalTreeToMdast } from '../../exportMarkdownFromLexical.js';
import { importMdastTreeToLexical } from '../../importMarkdownToLexical.js';
import type { Realm } from '../../realm/index.js';
import { isPartOftheEditorUI } from '../../utils/isPartOftheEditorUI.js';
import { isMdastEqualIgnoringPositions } from '../../utils/mdastEquality.js';
import {
	NESTED_EDITOR_UPDATED_COMMAND,
	codeBlockEditorDescriptors$,
	defaultCodeBlockLanguage$,
	directiveDescriptors$,
	exportVisitors$,
	importVisitors$,
	jsxComponentDescriptors$,
	jsxIsAvailable$,
	lexicalTheme$,
	rootEditor$,
	tableCellEditorRegistrations$,
	usedLexicalNodes$
} from '../core/index.js';
import { createExtensionEditor } from '../core/lexicalExtensions.js';
import { $isTableNode, type TableNode } from './TableNode.js';

/** A cell, as [column index, row index]. */
export type CellCoordinates = [number, number];

function $getTableNodeByKey(key: NodeKey): TableNode | null {
	const node = $getNodeByKey(key);
	return $isTableNode(node) ? node : null;
}

// With nothing left to delete in a direction, Lexical measures the deletion with the native
// Selection.modify, which moves the DOM caret and focus into the neighboring cell editor.
// The two cells then bounce focus between each other, which can loop forever and freeze the page.
function $isCollapsedAtCellEdge(isBackward: boolean): boolean {
	const selection = $getSelection();
	if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
	let node: LexicalNode | null = selection.anchor.getNode();
	const edgeOffset = isBackward
		? 0
		: $isElementNode(node)
			? node.getChildrenSize()
			: node.getTextContentSize();
	if (selection.anchor.offset !== edgeOffset) return false;
	while (node !== null && !$isRootNode(node)) {
		if ((isBackward ? node.getPreviousSibling() : node.getNextSibling()) !== null) return false;
		node = node.getParent();
	}
	return true;
}

/** The size of the table in the current state, which can be ahead of the rendered props. */
export function getTableSize(editor: LexicalEditor, tableKey: NodeKey): [number, number] {
	return editor.getEditorState().read(() => {
		const table = $getTableNodeByKey(tableKey);
		return table ? [table.getColCount(), table.getRowCount()] : [0, 0];
	});
}

/** Moves the selection out of the table, creating a paragraph below if there's nothing there. */
export function leaveTable(
	editor: LexicalEditor,
	tableKey: NodeKey,
	direction: 'next' | 'previous'
) {
	editor.update(() => {
		const table = $getTableNodeByKey(tableKey);
		if (!table) return;
		if (direction === 'previous') {
			table.selectPrevious();
		} else if (table.getNextSibling()) {
			table.selectNext();
		} else {
			const paragraph = $createParagraphNode();
			table.insertAfter(paragraph);
			paragraph.select();
		}
	});
}

/** Changes the table, and calls `done` with the result of `change` once it's committed. */
export function changeTable<T>(
	editor: LexicalEditor,
	tableKey: NodeKey,
	change: (table: TableNode) => T,
	done?: (result: T) => void
) {
	let result: { value: T } | null = null;
	editor.update(
		() => {
			const table = $getTableNodeByKey(tableKey);
			if (table) result = { value: change(table) };
		},
		{
			onUpdate: () => {
				if (result) done?.(result.value);
			}
		}
	);
}

/** Removes the whole table. */
export function deleteTable(editor: LexicalEditor, tableKey: NodeKey) {
	editor.update(() => {
		const table = $getTableNodeByKey(tableKey);
		if (!table) return;
		table.selectNext();
		table.remove();
	});
}

function importCell(realm: Realm, contents: Mdast.PhrasingContent[], root = $getRoot()) {
	importMdastTreeToLexical({
		root,
		mdastRoot: { type: 'root', children: [{ type: 'paragraph', children: contents }] },
		visitors: realm.getValue(importVisitors$),
		jsxComponentDescriptors: realm.getValue(jsxComponentDescriptors$),
		directiveDescriptors: realm.getValue(directiveDescriptors$),
		codeBlockEditorDescriptors: realm.getValue(codeBlockEditorDescriptors$),
		defaultCodeBlockLanguage: realm.getValue(defaultCodeBlockLanguage$)
	});
}

function $exportCell(realm: Realm): Mdast.PhrasingContent[] {
	const mdast = exportLexicalTreeToMdast({
		root: $getRoot(),
		jsxComponentDescriptors: realm.getValue(jsxComponentDescriptors$),
		visitors: realm.getValue(exportVisitors$),
		jsxIsAvailable: realm.getValue(jsxIsAvailable$),
		addImportStatements: false
	});
	const paragraph = mdast.children.find((node) => node.type === 'paragraph') as
		Mdast.Paragraph | undefined;
	return paragraph?.children ?? [];
}

/** Creates the Lexical editor of a table cell. */
export function createCellEditor(
	realm: Realm,
	parentEditor: LexicalEditor,
	contents: Mdast.PhrasingContent[]
): LexicalEditorWithDispose {
	return createExtensionEditor({
		name: '@sveltedown/table-cell',
		nodes: realm.getValue(usedLexicalNodes$),
		theme: realm.getValue(lexicalTheme$),
		namespace: 'TableCellEditor',
		parentEditor,
		historyMode: 'table-local',
		initialEditorState: () => {
			importCell(realm, contents);
		}
	});
}

/** The current values of a cell editor. Read when used, since a cell can move in the table. */
export interface CellSource {
	readonly parentEditor: LexicalEditor;
	readonly tableKey: NodeKey;
	readonly colIndex: number;
	readonly rowIndex: number;
	readonly focus: boolean;
	setActiveCell(cell: CellCoordinates | null): void;
}

/** Connects a cell editor to its table. `persisted` holds the contents last saved or restored. */
export function registerCellEditor(
	editor: LexicalEditorWithDispose,
	realm: Realm,
	source: CellSource,
	persisted: { current: Mdast.PhrasingContent[] }
): () => void {
	function save() {
		editor.getEditorState().read(() => {
			const nextContents = $exportCell(realm);
			const { parentEditor, tableKey, rowIndex, colIndex } = source;
			const sourceContents = parentEditor
				.getEditorState()
				.read(
					() =>
						$getTableNodeByKey(tableKey)?.getMdastNode().children[rowIndex]?.children[colIndex]
							?.children
				);
			// A parent restore can commit before the mounted editor is reconciled.
			// A queued blur must not write that editor's stale content back over it.
			if (
				!isMdastEqualIgnoringPositions(sourceContents, persisted.current) ||
				isMdastEqualIgnoringPositions(sourceContents, nextContents)
			) {
				return;
			}
			parentEditor.update(
				() => {
					const table = $getTableNodeByKey(tableKey);
					if (!table) return;
					table.updateCellContents(colIndex, rowIndex, nextContents);
					persisted.current = nextContents;
				},
				{ discrete: true, tag: SKIP_DOM_SELECTION_TAG }
			);
			parentEditor.dispatchCommand(NESTED_EDITOR_UPDATED_COMMAND, undefined);
		});
	}

	function saveAndFocus(nextCell: CellCoordinates | null) {
		save();
		source.setActiveCell(nextCell);
	}

	return mergeRegister(
		...realm.getValue(tableCellEditorRegistrations$).map((register) => register(editor, realm)),
		editor.registerCommand(
			KEY_TAB_COMMAND,
			(event) => {
				event.preventDefault();
				const { colIndex, rowIndex } = source;
				saveAndFocus(event.shiftKey ? [colIndex - 1, rowIndex] : [colIndex + 1, rowIndex]);
				return true;
			},
			COMMAND_PRIORITY_CRITICAL
		),
		editor.registerCommand(
			FOCUS_COMMAND,
			() => {
				source.setActiveCell([source.colIndex, source.rowIndex]);
				return false;
			},
			COMMAND_PRIORITY_LOW
		),
		editor.registerCommand(
			KEY_ENTER_COMMAND,
			(event) => {
				event?.preventDefault();
				const { colIndex, rowIndex } = source;
				saveAndFocus(event?.shiftKey ? [colIndex, rowIndex - 1] : [colIndex, rowIndex + 1]);
				return true;
			},
			COMMAND_PRIORITY_CRITICAL
		),
		editor.registerCommand(
			DELETE_CHARACTER_COMMAND,
			$isCollapsedAtCellEdge,
			COMMAND_PRIORITY_CRITICAL
		),
		editor.registerCommand(DELETE_WORD_COMMAND, $isCollapsedAtCellEdge, COMMAND_PRIORITY_CRITICAL),
		editor.registerCommand(DELETE_LINE_COMMAND, $isCollapsedAtCellEdge, COMMAND_PRIORITY_CRITICAL),
		editor.registerCommand(
			BLUR_COMMAND,
			(event) => {
				const relatedTarget = event.relatedTarget as HTMLElement | null;
				const rootElement = realm.getValue(rootEditor$)?.getRootElement();
				if (rootElement && isPartOftheEditorUI(relatedTarget, rootElement)) return false;
				saveAndFocus(null);
				return true;
			},
			COMMAND_PRIORITY_EDITOR
		),
		editor.registerCommand(
			NESTED_EDITOR_UPDATED_COMMAND,
			() => {
				// A late update, such as a finished upload, can arrive after the user
				// moved to another cell, which must stay active.
				if (source.focus) saveAndFocus(null);
				else save();
				return true;
			},
			COMMAND_PRIORITY_EDITOR
		)
	);
}

/**
 * Replaces the content of a cell when its persisted source changes, such as on a parent undo.
 * Rerenders and saves of other cells must not discard uncommitted typing.
 */
export function restoreCellContents(
	editor: LexicalEditorWithDispose,
	realm: Realm,
	contents: Mdast.PhrasingContent[],
	persisted: { current: Mdast.PhrasingContent[] }
) {
	if (isMdastEqualIgnoringPositions(persisted.current, contents)) return;
	persisted.current = contents;
	const current = editor.getEditorState().read(() => $exportCell(realm));
	if (isMdastEqualIgnoringPositions(current, contents)) return;
	editor.update(
		() => {
			importCell(realm, contents, $getRoot().clear());
		},
		{ discrete: true, tag: [HISTORIC_TAG, SKIP_DOM_SELECTION_TAG] }
	);
	// The authoritative source replaced this cell, not its siblings. Its old
	// local Undo/Redo states are no longer a valid baseline for subsequent edits.
	// Clearing this cell must not publish its availability to an active parent.
	const stopAvailabilityPropagation = mergeRegister(
		editor.registerCommand(CAN_UNDO_COMMAND, () => true, COMMAND_PRIORITY_CRITICAL),
		editor.registerCommand(CAN_REDO_COMMAND, () => true, COMMAND_PRIORITY_CRITICAL)
	);
	try {
		editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
	} finally {
		stopAvailabilityPropagation();
	}
}
