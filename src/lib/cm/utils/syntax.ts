import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';

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
