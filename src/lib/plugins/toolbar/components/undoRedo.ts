import { getPeerDependencyFromEditor } from '@lexical/extension';
import { HistoryExtension } from '@lexical/history';
import { mergeRegister } from '@lexical/utils';
import {
	CAN_REDO_COMMAND,
	CAN_UNDO_COMMAND,
	COMMAND_PRIORITY_CRITICAL,
	type LexicalEditor
} from 'lexical';

/** Follows whether the editor can undo and redo, starting with the current state. */
export function trackHistory(
	editor: LexicalEditor,
	setCanUndo: (value: boolean) => void,
	setCanRedo: (value: boolean) => void
): () => void {
	const history = getPeerDependencyFromEditor<typeof HistoryExtension>(
		editor,
		HistoryExtension.name
	)?.output;
	const historyState = history?.disabled.value ? undefined : history?.historyState.value;
	// Availability commands only describe future changes. Conditional toolbar
	// contents can mount after those commands have already been dispatched.
	setCanUndo((historyState?.undoStack.length ?? 0) > 0);
	setCanRedo((historyState?.redoStack.length ?? 0) > 0);
	return mergeRegister(
		editor.registerCommand<boolean>(
			CAN_UNDO_COMMAND,
			(payload) => {
				setCanUndo(payload);
				return false;
			},
			COMMAND_PRIORITY_CRITICAL
		),
		editor.registerCommand<boolean>(
			CAN_REDO_COMMAND,
			(payload) => {
				setCanRedo(payload);
				return false;
			},
			COMMAND_PRIORITY_CRITICAL
		)
	);
}
