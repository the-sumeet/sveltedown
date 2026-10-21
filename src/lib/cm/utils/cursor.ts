import { StateEffect, StateField, type EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Whether any selection range touches `[from, to]`. Boundaries count as inside, so a
 * cursor placed right before or after a node reveals its syntax.
 */
export function isCursorInRange(state: EditorState, from: number, to: number): boolean {
	return state.selection.ranges.some((range) => range.from <= to && range.to >= from);
}

/** Records a focus change; dispatched by `focusTracking()`. */
export const setEditorFocused = StateEffect.define<boolean>();

/** Whether the editor has focus, mirrored into the state so decorations can depend on it. */
export const editorFocused = StateField.define<boolean>({
	create: () => false,
	update(focused, tr) {
		for (const effect of tr.effects) if (effect.is(setEditorFocused)) focused = effect.value;
		return focused;
	}
});

/** Tracks focus so syntax is only revealed while the user is actually editing. */
export function focusTracking(): Extension {
	return [
		editorFocused,
		EditorView.focusChangeEffect.of((_, focusing) => setEditorFocused.of(focusing))
	];
}

/**
 * Whether the syntax of `[from, to]` should be shown as source: the cursor touches it,
 * and the editor is editable and focused. Without `focusTracking()` installed (e.g. a
 * bare `EditorState` in tests) focus is assumed.
 */
export function isRevealed(state: EditorState, from: number, to: number): boolean {
	if (!state.facet(EditorView.editable)) return false;
	if (state.field(editorFocused, false) === false) return false;
	return isCursorInRange(state, from, to);
}

/** Whether a transaction changed anything `isRevealed` depends on besides the selection. */
export function revealInputsChanged(startState: EditorState, state: EditorState): boolean {
	return (
		startState.facet(EditorView.editable) !== state.facet(EditorView.editable) ||
		startState.field(editorFocused, false) !== state.field(editorFocused, false)
	);
}
