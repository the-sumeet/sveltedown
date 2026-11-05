<script lang="ts">
	import { Popover, Toolbar } from 'bits-ui';
	import type { LexicalEditor } from 'lexical';
	import { useCellValue } from '../../realm/hooks.js';
	import Icon from '../../ui/Icon.svelte';
	import { useTranslation } from '../core/hooks.js';
	import { editorRootElementRef$ } from '../core/index.js';
	import { changeTable, type CellCoordinates } from './tableEditor.js';

	interface Props {
		parentEditor: LexicalEditor;
		tableKey: string;
		rowIndex: number;
		highlightedCoordinates: CellCoordinates;
		setActiveCell: (cell: CellCoordinates | null) => void;
	}

	let { parentEditor, tableKey, rowIndex, highlightedCoordinates, setActiveCell }: Props = $props();

	const editorRootElementRef = useCellValue(editorRootElementRef$);
	const t = useTranslation();

	// Radix closed the menu when focus moved into a cell. Close it after actions instead.
	let open = $state(false);

	function insertRowAt(index: number) {
		changeTable(
			parentEditor,
			tableKey,
			(table) => {
				table.insertRowAt(index);
				open = false;
			},
			() => {
				setActiveCell([0, index]);
			}
		);
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class="sd-table-column-editor-trigger"
		data-active={highlightedCoordinates[1] === rowIndex}
		title={t('table.rowMenu', 'Row menu')}
	>
		<Icon name="more_horiz" />
	</Popover.Trigger>
	<Popover.Portal to={editorRootElementRef.current?.current}>
		<Popover.Content
			class="sd-table-column-editor-popover-content"
			onOpenAutoFocus={(event) => event.preventDefault()}
			sideOffset={5}
			side="bottom"
		>
			<Toolbar.Root class="sd-table-column-editor-toolbar">
				<Toolbar.Button
					onclick={() => insertRowAt(rowIndex)}
					title={t('table.insertRowAbove', 'Insert a row above this one')}
				>
					<Icon name="insert_row_above" />
				</Toolbar.Button>
				<Toolbar.Button
					onclick={() => insertRowAt(rowIndex + 1)}
					title={t('table.insertRowBelow', 'Insert a row below this one')}
				>
					<Icon name="insert_row_below" />
				</Toolbar.Button>
				<Toolbar.Button
					onclick={() =>
						changeTable(parentEditor, tableKey, (table) => {
							table.deleteRowAt(rowIndex);
							open = false;
						})}
					title={t('table.deleteRow', 'Delete this row')}
				>
					<Icon name="delete_small" />
				</Toolbar.Button>
			</Toolbar.Root>
			<Popover.Arrow class="sd-popover-arrow" />
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
