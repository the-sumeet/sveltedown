import { createContext } from 'svelte';
import type { LexicalEditor } from 'lexical';
import { NESTED_EDITOR_UPDATED_COMMAND } from '../core/index.js';
import type { CodeBlockNode } from './CodeBlockNode.js';

/**
 * A set of functions that modify the underlying code block node.
 * Access this with {@link useCodeBlockEditorContext} in your custom code editor components.
 * @group Code Block
 */
export interface CodeBlockEditorContextValue {
	/** Updates the code contents of the code block. */
	setCode: (code: string) => void;
	/** Updates the language of the code block. */
	setLanguage: (language: string) => void;
	/** Updates the meta of the code block: the string that comes after the language. */
	setMeta: (meta: string) => void;
	/** The Lexical node that's being edited. */
	readonly lexicalNode: CodeBlockNode;
	/** The parent Lexical editor. */
	readonly parentEditor: LexicalEditor;
}

const [getContext, setContext] = createContext<CodeBlockEditorContextValue>();

/**
 * Use this in your custom code block editors to modify the node's code, language, and meta.
 * @group Code Block
 */
export const useCodeBlockEditorContext: () => CodeBlockEditorContextValue = getContext;

/** @internal */
export function setCodeBlockEditorContext(source: {
	readonly parentEditor: LexicalEditor;
	readonly codeBlockNode: CodeBlockNode;
}): void {
	setContext({
		get lexicalNode() {
			return source.codeBlockNode;
		},
		get parentEditor() {
			return source.parentEditor;
		},
		setCode(code) {
			source.parentEditor.update(() => {
				source.codeBlockNode.setCode(code);
				setTimeout(() => {
					source.parentEditor.dispatchCommand(NESTED_EDITOR_UPDATED_COMMAND, undefined);
				}, 0);
			});
		},
		setLanguage(language) {
			source.parentEditor.update(() => {
				source.codeBlockNode.setLanguage(language);
			});
		},
		setMeta(meta) {
			source.parentEditor.update(() => {
				source.codeBlockNode.setMeta(meta);
			});
		}
	});
}
