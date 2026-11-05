import { mergeRegister } from '@lexical/utils';
import {
	$getNodeByKey,
	$getRoot,
	BLUR_COMMAND,
	COMMAND_PRIORITY_CRITICAL,
	COMMAND_PRIORITY_EDITOR,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	FOCUS_COMMAND,
	KEY_BACKSPACE_COMMAND,
	SELECTION_CHANGE_COMMAND,
	type LexicalEditorWithDispose
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
	editorInFocus$,
	exportVisitors$,
	historyState$,
	importVisitors$,
	jsxComponentDescriptors$,
	jsxIsAvailable$,
	lexicalTheme$,
	lexicalExtensions$,
	nestedEditorRegistrations$,
	rootEditor$,
	usedLexicalNodes$
} from './index.js';
import { createExtensionEditor, editorHasSharedHistory } from './lexicalExtensions.js';
import type { MdastEditableNode, NestedEditorsContextValue } from './nestedEditorContext.js';

export interface NestedEditorOptions<T extends Mdast.RootContent> {
	realm: Realm;
	context: NestedEditorsContextValue<T>;
	/** Whether the editor edits blocks (multiple paragraphs). */
	block: boolean;
	getContent(mdastNode: T): Mdast.RootContent[];
	getUpdatedMdastNode(mdastNode: T, children: Mdast.RootContent[]): T;
	updateMdastNode(node: Partial<T>): void;
	removeNode(): void;
}

/** Creates the Lexical editor behind `NestedLexicalEditor`, with its content imported. */
export function createNestedEditor<T extends Mdast.RootContent>({
	realm,
	context,
	block,
	getContent
}: NestedEditorOptions<T>): LexicalEditorWithDispose {
	const rootEditor = realm.getValue(rootEditor$);
	const historyMode = rootEditor && editorHasSharedHistory(rootEditor);

	return createExtensionEditor({
		name: '@sveltedown/nested',
		nodes: realm.getValue(usedLexicalNodes$),
		theme: realm.getValue(lexicalTheme$),
		namespace: 'NestedEditor',
		parentEditor: context.parentEditor,
		extensions: realm.getValue(lexicalExtensions$),
		historyMode: historyMode ? 'nested-shared' : 'nested-external',
		historyState: realm.getValue(historyState$),
		initialEditorState: () => {
			const content = getContent(context.mdastNode);
			let children: Mdast.RootContent[] = content;
			if (block) {
				if (children.length === 0) children = [{ type: 'paragraph', children: [] }];
			} else {
				children = [{ type: 'paragraph', children: content as Mdast.PhrasingContent[] }];
			}

			importMdastTreeToLexical({
				root: $getRoot(),
				mdastRoot: { type: 'root', children },
				visitors: realm.getValue(importVisitors$),
				directiveDescriptors: realm.getValue(directiveDescriptors$),
				codeBlockEditorDescriptors: realm.getValue(codeBlockEditorDescriptors$),
				defaultCodeBlockLanguage: realm.getValue(defaultCodeBlockLanguage$),
				jsxComponentDescriptors: realm.getValue(jsxComponentDescriptors$)
			});
		}
	});
}

/** Connects a nested editor to its parent: focus tracking, and saving its content to the node. */
export function registerNestedEditor<T extends Mdast.RootContent>(
	editor: LexicalEditorWithDispose,
	{
		realm,
		context,
		block,
		getUpdatedMdastNode,
		updateMdastNode,
		removeNode
	}: NestedEditorOptions<T>
): () => void {
	const focusState = () => ({
		editorType: 'lexical',
		rootNode: context.lexicalNode,
		editorRef: editor
	});

	function updateParentNode() {
		editor.getEditorState().read(() => {
			const mdast = exportLexicalTreeToMdast({
				root: $getRoot(),
				visitors: realm.getValue(exportVisitors$),
				jsxComponentDescriptors: realm.getValue(jsxComponentDescriptors$),
				jsxIsAvailable: realm.getValue(jsxIsAvailable$),
				addImportStatements: false
			});
			const content: Mdast.RootContent[] = block
				? mdast.children
				: (mdast.children[0] as Mdast.Paragraph).children;
			const updatedMdastNode = getUpdatedMdastNode(structuredClone(context.mdastNode), content);
			const currentMdastNode = context.parentEditor.getEditorState().read(() => {
				const node = $getNodeByKey(context.lexicalNode.getKey()) as MdastEditableNode | null;
				return node?.getMdastNode();
			});
			// Blur and view mode switches save unconditionally. Rewriting an
			// unchanged node would push an extra root Undo step.
			if (isMdastEqualIgnoringPositions(currentMdastNode, updatedMdastNode)) return;
			updateMdastNode(updatedMdastNode);
		});
	}

	return mergeRegister(
		...realm.getValue(nestedEditorRegistrations$).map((register) => register(editor, realm)),
		editor.registerCommand(
			FOCUS_COMMAND,
			() => {
				realm.pub(editorInFocus$, focusState());
				return false;
			},
			COMMAND_PRIORITY_LOW
		),
		editor.registerCommand(
			BLUR_COMMAND,
			(payload) => {
				const relatedTarget = payload.relatedTarget as HTMLElement | null;
				const rootElement = realm.getValue(rootEditor$)?.getRootElement();
				if (rootElement && isPartOftheEditorUI(relatedTarget, rootElement)) return false;
				updateParentNode();
				realm.pub(editorInFocus$, null);
				return true;
			},
			COMMAND_PRIORITY_EDITOR
		),
		// triggered by codemirror
		editor.registerCommand(
			NESTED_EDITOR_UPDATED_COMMAND,
			() => {
				updateParentNode();
				return true;
			},
			COMMAND_PRIORITY_EDITOR
		),
		editor.registerCommand(
			SELECTION_CHANGE_COMMAND,
			() => {
				realm.pub(editorInFocus$, focusState());
				return false;
			},
			COMMAND_PRIORITY_HIGH
		),
		editor.registerCommand(
			KEY_BACKSPACE_COMMAND,
			(event, activeEditor) => {
				// the innerText here is actually the text before backspace takes effect.
				if (activeEditor.getRootElement()?.innerText === '\n') {
					// By the time the browser's default runs, the selection has moved to the
					// root editor, where it would merge the paragraphs around this node.
					event.preventDefault();
					removeNode();
					return true;
				}
				return false;
			},
			COMMAND_PRIORITY_CRITICAL
		)
	);
}
