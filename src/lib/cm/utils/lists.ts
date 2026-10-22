import { syntaxTree } from '@codemirror/language';
import type { ChangeSpec, EditorState, StateCommand } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';

/** The innermost list item on line `n`: the one whose marker starts it, or that it continues. */
function listItemOnLine(state: EditorState, n: number): SyntaxNode | null {
	const line = state.doc.line(n);
	const start = line.from + (/^\s*/.exec(line.text)?.[0].length ?? 0);
	for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(start, 1); node;) {
		if (node.name === 'ListItem') return node;
		node = node.parent;
	}
	return null;
}

function column(state: EditorState, pos: number): number {
	return pos - state.doc.lineAt(pos).from;
}

/** Where an item's text starts, which is where a child item's marker must go. */
function contentColumn(state: EditorState, item: SyntaxNode): number {
	const mark = item.getChild('ListMark');
	if (!mark) return column(state, item.from);
	const spaces = /^ */.exec(state.sliceDoc(mark.to, state.doc.lineAt(mark.to).to))![0].length;
	// No text, or 5+ spaces (an indented code block): the content starts one space in.
	return column(state, mark.to) + (spaces === 0 || spaces > 4 ? 1 : spaces);
}

/**
 * The outermost list items on the selected lines, so a parent and its child selected
 * together move once, with the parent.
 */
function selectedItems(state: EditorState): SyntaxNode[] {
	const items = new Map<number, SyntaxNode>();
	for (const range of state.selection.ranges) {
		const first = state.doc.lineAt(range.from).number;
		const last = state.doc.lineAt(range.to).number;
		for (let n = first; n <= last; n++) {
			const item = listItemOnLine(state, n);
			if (item) items.set(item.from, item);
		}
	}
	const all = [...items.values()];
	return all.filter(
		(item) => !all.some((o) => o !== item && o.from <= item.from && item.to <= o.to)
	);
}

/** Indents or outdents every line of each selected item (children included) by its own amount. */
function shiftItems(
	state: EditorState,
	amountFor: (item: SyntaxNode) => number,
	outdent: boolean
): ChangeSpec[] | null {
	const items = selectedItems(state);
	if (!items.length) return null;
	const changes: ChangeSpec[] = [];
	for (const item of items) {
		const amount = amountFor(item);
		if (amount <= 0) continue;
		const first = state.doc.lineAt(item.from).number;
		const last = state.doc.lineAt(item.to).number;
		for (let n = first; n <= last; n++) {
			const line = state.doc.line(n);
			if (!outdent) {
				changes.push({ from: line.from, insert: ' '.repeat(amount) });
				continue;
			}
			const remove = Math.min(amount, /^ */.exec(line.text)![0].length);
			if (remove) changes.push({ from: line.from, to: line.from + remove });
		}
	}
	return changes;
}

/**
 * Tab in a list: nests the selected items (with their children) under the previous item,
 * indenting them to its text, e.g. 2 spaces under `- ` and 3 under `1. `. Outside a list
 * it does nothing, so Tab keeps moving focus out of the editor.
 */
export const indentListItem: StateCommand = ({ state, dispatch }) => {
	if (state.readOnly) return false;
	const changes = shiftItems(
		state,
		(item) => {
			// The first item of a list has no item to nest under: indent by its own marker.
			const prev = item.prevSibling?.name === 'ListItem' ? item.prevSibling : item;
			return contentColumn(state, prev) - column(state, item.from);
		},
		false
	);
	if (!changes) return false;
	if (changes.length) {
		dispatch(state.update({ changes, scrollIntoView: true, userEvent: 'input.indent' }));
	}
	return true;
};

/**
 * Shift-Tab in a list: moves the selected items out one level, back to their parent's
 * marker. Top-level items stay put, but the key is still handled so focus stays in the list.
 */
export const outdentListItem: StateCommand = ({ state, dispatch }) => {
	if (state.readOnly) return false;
	const changes = shiftItems(
		state,
		(item) => {
			const parent = item.parent?.parent;
			const target = parent?.name === 'ListItem' ? column(state, parent.from) : 0;
			return column(state, item.from) - target;
		},
		true
	);
	if (!changes) return false;
	if (changes.length) {
		dispatch(state.update({ changes, scrollIntoView: true, userEvent: 'delete.dedent' }));
	}
	return true;
};
