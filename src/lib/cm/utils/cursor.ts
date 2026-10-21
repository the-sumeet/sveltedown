import type { EditorState } from '@codemirror/state';

/**
 * Whether any selection range touches `[from, to]`. Boundaries count as inside, so a
 * cursor placed right before or after a node reveals its syntax.
 */
export function isCursorInRange(state: EditorState, from: number, to: number): boolean {
	return state.selection.ranges.some((range) => range.from <= to && range.to >= from);
}
