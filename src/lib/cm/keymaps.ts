import { EditorSelection, Prec, type Extension, type StateCommand } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { defaultKeymap, historyKeymap } from '@codemirror/commands';
import type { SyntaxNode } from '@lezer/common';
import { findNodeAt } from './utils/syntax.js';

const WRAP_NODES: Record<string, { node: string; mark: string }> = {
	'**': { node: 'StrongEmphasis', mark: 'EmphasisMark' },
	'*': { node: 'Emphasis', mark: 'EmphasisMark' },
	'~~': { node: 'Strikethrough', mark: 'StrikethroughMark' }
};

/**
 * Toggles inline markup like `**` around each selection range. Ranges inside an existing
 * node of that kind are unwrapped (found via the syntax tree, so `*` never matches the
 * markers of `**bold**`); otherwise the selection, or the word at the cursor, is wrapped.
 */
export function toggleWrap(marker: string): StateCommand {
	const kind = WRAP_NODES[marker];
	return ({ state, dispatch }) => {
		if (state.readOnly) return false;
		const tr = state.changeByRange((range) => {
			const node: SyntaxNode | null = kind ? findNodeAt(state, range.from, kind.node) : null;
			const inside =
				node &&
				(range.empty
					? node.from < range.head && range.head < node.to
					: node.from <= range.from && range.to <= node.to);
			if (node && inside) {
				const marks = node.getChildren(kind.mark);
				const changes = state.changes(
					[marks[0], marks[marks.length - 1]].map((m) => ({ from: m.from, to: m.to }))
				);
				return { changes, range: range.map(changes) };
			}

			let { from, to } = range;
			if (range.empty) {
				const word = state.wordAt(range.head);
				if (word) ({ from, to } = word);
			}
			// `** bold **` is not bold, so keep surrounding whitespace outside the markers.
			while (from < to && /\s/.test(state.sliceDoc(from, from + 1))) from++;
			while (to > from && /\s/.test(state.sliceDoc(to - 1, to))) to--;

			const changes = [
				{ from, insert: marker },
				{ from: to, insert: marker }
			];
			const n = marker.length;
			if (range.empty) return { changes, range: EditorSelection.cursor(range.head + n) };
			const [anchor, head] = range.anchor <= range.head ? [from, to] : [to, from];
			return { changes, range: EditorSelection.range(anchor + n, head + n) };
		});
		dispatch(state.update(tr, { scrollIntoView: true, userEvent: 'input.format' }));
		return true;
	};
}

export const toggleBold = toggleWrap('**');
export const toggleItalic = toggleWrap('*');
export const toggleStrikethrough = toggleWrap('~~');

/**
 * Turns the selection (or the word at the cursor) into `[text](url)` with `url` selected.
 * A selected URL becomes `[](url)` with the cursor in the brackets.
 */
export const insertLink: StateCommand = ({ state, dispatch }) => {
	if (state.readOnly) return false;
	const tr = state.changeByRange((range) => {
		let { from, to } = range;
		if (range.empty) {
			const word = state.wordAt(range.head);
			if (word) ({ from, to } = word);
		}
		const text = state.sliceDoc(from, to);
		if (/^https?:\/\/\S+$/.test(text)) {
			return {
				changes: { from, to, insert: `[](${text})` },
				range: EditorSelection.cursor(from + 1)
			};
		}
		const urlFrom = from + text.length + 3;
		return {
			changes: { from, to, insert: `[${text}](url)` },
			range: text ? EditorSelection.range(urlFrom, urlFrom + 3) : EditorSelection.cursor(from + 1)
		};
	});
	dispatch(state.update(tr, { scrollIntoView: true, userEvent: 'input.format' }));
	return true;
};

/** Markdown formatting shortcuts. */
export const formattingKeymap = [
	{ key: 'Mod-b', run: toggleBold, preventDefault: true },
	{ key: 'Mod-i', run: toggleItalic, preventDefault: true },
	{ key: 'Mod-Shift-x', run: toggleStrikethrough, preventDefault: true },
	{ key: 'Mod-k', run: insertLink, preventDefault: true }
];

/**
 * Formatting shortcuts (taking precedence over defaults such as `Mod-i`, "select parent
 * syntax"), plus the default and history keymaps. List continuation on Enter comes from
 * `@codemirror/lang-markdown`'s own keymap.
 */
export function editorKeymaps(): Extension {
	return [Prec.high(keymap.of(formattingKeymap)), keymap.of([...defaultKeymap, ...historyKeymap])];
}
