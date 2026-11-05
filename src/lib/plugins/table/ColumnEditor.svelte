<script lang="ts">
	import { Popover, Separator, Toolbar } from 'bits-ui';
	import type { LexicalEditor } from 'lexical';
	import type * as Mdast from 'mdast';
	import { useCellValue } from '../../realm/hooks.js';
	import Icon from '../../ui/Icon.svelte';
	import { useTranslation } from '../core/hooks.js';
	import { editorRootElementRef$ } from '../core/index.js';
	import { changeTable, type CellCoordinates } from './tableEditor.js';

	interface Props {
		parentEditor: LexicalEditor;
		tableKey: string;
		colIndex: number;
		align?: Mdast.AlignType;
		highlightedCoordinates: CellCoordinates;
		setActiveCell: (cell: CellCoordinates | null) => void;
	}

	let { parentEditor, tableKey, colIndex, align, highlightedCoordinates, setActiveCell }: Props =
		$props();

	const editorRootElementRef = useCellValue(editorRootElementRef$);
	const t = useTranslation();

	function insertColumnAt(index: number) {
		changeTable(
			parentEditor,
			tableKey,
			(table) => {
				table.insertColumnAt(index);
			},
			() => {
				setActiveCell([index, 0]);
			}
		);
	}
</script>

<Popover.Root>
	<Popover.Trigger
		class="sd-table-column-editor-trigger"
		data-active={highlightedCoordinates[0] === colIndex + 1}
		title={t('table.columnMenu', 'Column menu')}
	>
		<Icon name="more_horiz" />
	</Popover.Trigger>
	<Popover.Portal to={editorRootElementRef.current?.current}>
		<Popover.Content
			class="sd-table-column-editor-popover-content"
			onOpenAutoFocus={(event) => event.preventDefault()}
			sideOffset={5}
			side="top"
		>
			<Toolbar.Root class="sd-table-column-editor-toolbar">
				<Toolbar.Group
					type="single"
					class="sd-toggle-group-root"
					aria-label={t('table.textAlignment', 'Text alignment')}
					bind:value={
						() => align ?? 'left',
						(value) => {
							changeTable(parentEditor, tableKey, (table) => {
								table.setColumnAlign(colIndex, value as Mdast.AlignType);
							});
						}
					}
				>
					<Toolbar.GroupItem value="left" title={t('table.alignLeft', 'Align left')}>
						<Icon name="format_align_left" />
					</Toolbar.GroupItem>
					<Toolbar.GroupItem value="center" title={t('table.alignCenter', 'Align center')}>
						<Icon name="format_align_center" />
					</Toolbar.GroupItem>
					<Toolbar.GroupItem value="right" title={t('table.alignRight', 'Align right')}>
						<Icon name="format_align_right" />
					</Toolbar.GroupItem>
				</Toolbar.Group>
				<Separator.Root orientation="vertical" />
				<Toolbar.Button
					onclick={() => insertColumnAt(colIndex)}
					title={t('table.insertColumnLeft', 'Insert a column to the left of this one')}
				>
					<Icon name="insert_col_left" />
				</Toolbar.Button>
				<Toolbar.Button
					onclick={() => insertColumnAt(colIndex + 1)}
					title={t('table.insertColumnRight', 'Insert a column to the right of this one')}
				>
					<Icon name="insert_col_right" />
				</Toolbar.Button>
				<Toolbar.Button
					onclick={() =>
						changeTable(parentEditor, tableKey, (table) => {
							table.deleteColumnAt(colIndex);
						})}
					title={t('table.deleteColumn', 'Delete this column')}
				>
					<Icon name="delete_small" />
				</Toolbar.Button>
			</Toolbar.Root>
			<Popover.Arrow class="sd-popover-arrow" />
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
