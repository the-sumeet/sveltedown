import type { EditorState, SelectionRange } from '@codemirror/state';
import type { Command, EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { findNodeAt } from './syntax.js';

/**
 * Document position for `offset` into the code shown by a rendered block whose widget
 * sits at `widgetPos`. Columns are counted from the line end, so whatever indentation
 * or container markup was stripped from the start of the line does not matter.
 */
export function codeOffsetToPos(
	state: EditorState,
	widgetPos: number,
	code: string,
	offset: number
): number | null {
	// The widget covers whole lines, so `widgetPos` can sit before a fence's indentation.
	// The end of that line is inside the fence either way.
	const block = findNodeAt(state, state.doc.lineAt(widgetPos).to, 'FencedCode');
	if (!block) return null;
	const open = state.doc.lineAt(block.from);
	const before = code.slice(0, offset).split('\n');
	const lineNumber = open.number + before.length;
	if (lineNumber > state.doc.lines) return open.to;
	const line = state.doc.line(lineNumber);
	const codeLine = code.split('\n')[before.length - 1] ?? '';
	const column = before[before.length - 1].length;
	return Math.max(line.from, Math.min(line.to, line.to - (codeLine.length - column)));
}

function inFencedCode(state: EditorState, range: SelectionRange): boolean {
	return findNodeAt(state, range.head, 'FencedCode') !== null;
}

// With line wrapping on, the default Home/End stop at the visible edge of a long,
// unwrapped code line. Inside code blocks, go to the real line boundaries instead.
function lineBoundary(forward: boolean, extend: boolean): Command {
	return (view: EditorView) => {
		const { state } = view;
		if (!state.selection.ranges.every((range) => inFencedCode(state, range))) return false;
		const selection = EditorSelection.create(
			state.selection.ranges.map((range) => {
				const line = state.doc.lineAt(range.head);
				const head = forward ? line.to : line.from;
				// Associate with this line's side, as CodeMirror does, so scrolling measures
				// the cursor on this line rather than across the line break.
				const assoc = forward ? -1 : 1;
				return extend
					? EditorSelection.range(range.anchor, head, undefined, undefined, assoc)
					: EditorSelection.cursor(head, assoc);
			}),
			state.selection.mainIndex
		);
		view.dispatch({ selection, scrollIntoView: true, userEvent: 'select' });
		return true;
	};
}

export const codeBlockKeymap = [
	{ key: 'Home', run: lineBoundary(false, false), shift: lineBoundary(false, true) },
	{ key: 'End', run: lineBoundary(true, false), shift: lineBoundary(true, true) },
	{ mac: 'Cmd-ArrowLeft', run: lineBoundary(false, false), shift: lineBoundary(false, true) },
	{ mac: 'Cmd-ArrowRight', run: lineBoundary(true, false), shift: lineBoundary(true, true) }
];
