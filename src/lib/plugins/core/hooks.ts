import { createContext } from 'svelte';
import type { LexicalEditor } from 'lexical';
import { useCellValue } from '../../realm/hooks.js';
import { translation$, type Translation } from './index.js';

/** Returns a function translating a key. Call it again if the `translation` prop can change. */
export function useTranslation(): Translation {
	const translation = useCellValue(translation$);
	return (key, defaultValue, interpolations) =>
		translation.current(key, defaultValue, interpolations);
}

const [getLexicalEditor, setLexicalEditor] = createContext<LexicalEditor>();

/** The Lexical editor that surrounds a composer or nested editor child component. */
export const useLexicalEditor: () => LexicalEditor = getLexicalEditor;
/** @internal */
export const setLexicalEditorContext: (editor: LexicalEditor) => void = (editor) => {
	setLexicalEditor(editor);
};
