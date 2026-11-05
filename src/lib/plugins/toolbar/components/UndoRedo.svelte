<!-- @component Lets the user undo and redo changes in the editor. -->
<script lang="ts">
	import { REDO_COMMAND, UNDO_COMMAND } from 'lexical';
	import { useCellValue } from '../../../realm/hooks.js';
	import { IS_APPLE } from '../../../utils/detectMac.js';
	import { useTranslation } from '../../core/hooks.js';
	import { activeEditor$ } from '../../core/index.js';
	import MultipleChoiceToggleGroup from '../primitives/MultipleChoiceToggleGroup.svelte';
	import { trackHistory } from './undoRedo.js';

	const activeEditor = useCellValue(activeEditor$);
	const t = useTranslation();

	let canUndo = $state(false);
	let canRedo = $state(false);

	$effect(() => {
		const editor = activeEditor.current;
		if (!editor) {
			canUndo = false;
			canRedo = false;
			return;
		}
		return trackHistory(
			editor,
			(value) => {
				canUndo = value;
			},
			(value) => {
				canRedo = value;
			}
		);
	});
</script>

<MultipleChoiceToggleGroup
	items={[
		{
			title: t('toolbar.undo', 'Undo {{shortcut}}', { shortcut: IS_APPLE ? '⌘Z' : 'Ctrl+Z' }),
			disabled: !canUndo,
			icon: 'undo',
			active: false,
			onChange: () => activeEditor.current?.dispatchCommand(UNDO_COMMAND, undefined)
		},
		{
			title: t('toolbar.redo', 'Redo {{shortcut}}', { shortcut: IS_APPLE ? '⌘Y' : 'Ctrl+Y' }),
			disabled: !canRedo,
			icon: 'redo',
			active: false,
			onChange: () => activeEditor.current?.dispatchCommand(REDO_COMMAND, undefined)
		}
	]}
/>
