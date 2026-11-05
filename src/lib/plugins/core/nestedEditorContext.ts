import { createContext } from 'svelte';
import { $addUpdateTag, $getNodeByKey } from 'lexical';
import type { DecoratorNode, EditorConfig, LexicalEditor } from 'lexical';
import type * as Mdast from 'mdast';
import type { Node } from 'unist';
import type { VoidEmitter } from '../../utils/voidEmitter.js';
import { NESTED_EDITOR_UPDATED_COMMAND } from './index.js';

/** A decorator node holding an mdast subtree, such as a directive or a JSX element. */
export interface MdastEditableNode extends DecoratorNode<unknown> {
	getMdastNode(): unknown;
	/** Updates the mdast node. This also updates the mdast tree of the parent editor. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- every node type has its own mdast
	setMdastNode(mdastNode: any): void;
}

/** The value of the nested editors context. Read its properties when you use them. */
export interface NestedEditorsContextValue<T extends Node = Node> {
	/** The parent lexical editor. */
	readonly parentEditor: LexicalEditor;
	/** The parent editor config. */
	readonly config: EditorConfig;
	/** The mdast node that is being edited. */
	readonly mdastNode: T;
	/** The lexical node that is being edited. */
	readonly lexicalNode: MdastEditableNode;
	/** Subscribe to the emitter and implement the logic to focus the custom editor. */
	readonly focusEmitter: VoidEmitter;
}

const [getContext, setContext] = createContext<NestedEditorsContextValue>();

/** Provides the values for {@link useNestedEditorContext}. See `NestedEditorsProvider.svelte`. */
export function setNestedEditorsContext(value: NestedEditorsContextValue): void {
	setContext(value);
}

/** The current nested editors context. Use this in your custom editor components. */
export function useNestedEditorContext<
	T extends Mdast.RootContent
>(): NestedEditorsContextValue<T> {
	return getContext() as unknown as NestedEditorsContextValue<T>;
}

/** Returns a function that updates the mdast node. Use this in your custom editor components. */
export function useMdastNodeUpdater<T extends Mdast.RootContent>(): (node: Partial<T>) => void {
	const context = useNestedEditorContext<T>();

	return function updateMdastNode(node) {
		const { parentEditor, lexicalNode, mdastNode } = context;
		parentEditor.update(
			() => {
				$addUpdateTag('history-push');
				const currentNode = $getNodeByKey(lexicalNode.getKey()) as MdastEditableNode | null;
				if (currentNode) currentNode.setMdastNode({ ...mdastNode, ...node });
			},
			{ discrete: true }
		);
		parentEditor.dispatchCommand(NESTED_EDITOR_UPDATED_COMMAND, undefined);
	};
}

/** Returns a function that removes the lexical node from the editor. */
export function useLexicalNodeRemove(): () => void {
	const context = useNestedEditorContext();

	return () => {
		const { parentEditor, lexicalNode } = context;
		parentEditor.update(() => {
			const node = $getNodeByKey(lexicalNode.getKey());
			node?.selectNext();
			node?.remove();
		});
	};
}
