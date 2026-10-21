import type { EditorState, TransactionSpec } from '@codemirror/state';
import { findNodeAt } from './syntax.js';

/**
 * The transaction that flips the task marker at `pos` between `[ ]` and `[x]`,
 * or `null` if there is none or the editor is read-only.
 */
export function toggleTask(state: EditorState, pos: number): TransactionSpec | null {
	if (state.readOnly) return null;
	const marker = findNodeAt(state, pos, 'TaskMarker');
	if (!marker) return null;
	const checked = /^\[[xX]\]$/.test(state.sliceDoc(marker.from, marker.to));
	return {
		changes: { from: marker.from + 1, to: marker.to - 1, insert: checked ? ' ' : 'x' },
		userEvent: 'input.toggle-task'
	};
}
