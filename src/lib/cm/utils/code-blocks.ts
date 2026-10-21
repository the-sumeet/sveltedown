import { EditorSelection, type EditorState, type Line } from '@codemirror/state';
import type { Command, EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import { findNodeAt } from './syntax.js';

/** Whether a FencedCode node has a closing fence (on its own line). */
export function isClosedFence(state: EditorState, node: SyntaxNode): boolean {
	const open = node.firstChild!;
	const close = node.lastChild!;
	return (
		close !== open &&
		close.name === 'CodeMark' &&
		state.doc.lineAt(close.from).number !== state.doc.lineAt(open.from).number
	);
}

/**
 * The content lines of a fenced code block, each with the position where its code
 * starts. `CodeText` already excludes container markup (list indentation, `>` marks)
 * but keeps the fence's own indentation, which is stripped as CommonMark specifies.
 */
export function codeContentLines(
	state: EditorState,
	node: SyntaxNode
): { line: Line; start: number }[] {
	const { doc } = state;
	const first = doc.lineAt(node.from).number;
	const last = doc.lineAt(node.to).number - (isClosedFence(state, node) ? 1 : 0);
	const texts = node.getChildren('CodeText');
	const column = (pos: number) => pos - doc.lineAt(pos).from;
	const fenceIndent = texts.length ? Math.max(0, column(node.from) - column(texts[0].from)) : 0;

	const lines: { line: Line; start: number }[] = [];
	for (let n = first + 1; n <= last; n++) {
		const line = doc.line(n);
		const startsHere = texts.find((t) => t.from >= line.from && t.from <= line.to);
		const spansIn = texts.find((t) => t.from < line.from && t.to > line.from);
		let start = startsHere ? startsHere.from : spansIn ? line.from : line.to;
		for (
			let i = 0;
			i < fenceIndent && start < line.to && doc.sliceString(start, start + 1) === ' ';
			i++
		) {
			start++;
		}
		lines.push({ line, start });
	}
	return lines;
}

/** Language (first word of the info string), full info string and code of a fenced block. */
export function fencedCodeParts(state: EditorState, node: SyntaxNode) {
	const infoNode = node.getChild('CodeInfo');
	const info = infoNode ? state.sliceDoc(infoNode.from, infoNode.to).trim() : '';
	const code = codeContentLines(state, node)
		.map(({ line, start }) => state.sliceDoc(start, line.to))
		.join('\n');
	return { language: info.split(/\s+/)[0] ?? '', info, code };
}

function fencedCodeAround(state: EditorState, pos: number): SyntaxNode | null {
	// A rendered block's widget covers whole lines, so `pos` can sit before a fence's
	// indentation or container markup. The end of that line is inside the fence.
	return findNodeAt(state, state.doc.lineAt(pos).to, 'FencedCode');
}

/**
 * Document position for `offset` into the code shown by a rendered block whose widget
 * sits at `widgetPos`, or `null` if there is no block there.
 */
export function codeOffsetToPos(
	state: EditorState,
	widgetPos: number,
	code: string,
	offset: number
): number | null {
	const block = fencedCodeAround(state, widgetPos);
	if (!block) return null;
	const before = code.slice(0, offset).split('\n');
	const target = codeContentLines(state, block)[before.length - 1];
	if (!target) return state.doc.lineAt(block.from).to;
	return Math.min(target.line.to, target.start + before[before.length - 1].length);
}

/**
 * Where Home should go on a line inside a fenced block: the start of the code on
 * content lines, the fence itself on fence lines. `null` outside code blocks.
 */
export function codeLineStart(state: EditorState, pos: number): number | null {
	const block = findNodeAt(state, pos, 'FencedCode');
	if (!block) return null;
	const line = state.doc.lineAt(pos);
	if (line.number === state.doc.lineAt(block.from).number) return block.from;
	const content = codeContentLines(state, block).find((l) => l.line.number === line.number);
	return content ? content.start : block.lastChild!.from;
}

// With line wrapping on, the default Home/End stop at the visible edge of a long,
// unwrapped code line. Inside code blocks, go to the real line boundaries instead.
function lineBoundary(forward: boolean, extend: boolean): Command {
	return (view: EditorView) => {
		const { state } = view;
		const targets = state.selection.ranges.map((range) =>
			forward
				? findNodeAt(state, range.head, 'FencedCode') && state.doc.lineAt(range.head).to
				: codeLineStart(state, range.head)
		);
		if (targets.some((target) => target === null)) return false;
		const selection = EditorSelection.create(
			state.selection.ranges.map((range, i) => {
				const head = targets[i]!;
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
