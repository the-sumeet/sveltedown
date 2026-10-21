import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';

const unescape = (text: string) => text.replace(/\\([!-/:-@[-`{-~])/g, '$1');

/** A link or image destination as a URL: `<...>` brackets removed, backslash escapes resolved. */
export function linkDestination(state: EditorState, url: SyntaxNode): string {
	let text = state.sliceDoc(url.from, url.to);
	if (text.startsWith('<') && text.endsWith('>')) text = text.slice(1, -1);
	return unescape(text);
}

/** A link or image title without its `"…"`, `'…'` or `(…)` delimiters. */
export function linkTitle(state: EditorState, title: SyntaxNode): string {
	return unescape(state.sliceDoc(title.from + 1, title.to - 1));
}

/** The nearest node named `name` touching `pos` (looking at either side of it), or `null`. */
export function findNodeAt(state: EditorState, pos: number, name: string): SyntaxNode | null {
	for (const side of [1, -1] as const) {
		for (
			let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, side);
			node;
			node = node.parent
		) {
			if (node.name === name) return node;
		}
	}
	return null;
}
