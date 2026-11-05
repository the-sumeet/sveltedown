<script lang="ts">
	import type { LexicalEditor } from 'lexical';
	import type * as Mdast from 'mdast';
	import { useCellValue } from '../../realm/hooks.js';
	import Icon from '../../ui/Icon.svelte';
	import { uuidv4 } from '../../utils/uuid4.js';
	import { useTranslation } from '../core/hooks.js';
	import { readOnly$ } from '../core/index.js';
	import CellEditor from './CellEditor.svelte';
	import ColumnEditor from './ColumnEditor.svelte';
	import RowEditor from './RowEditor.svelte';
	import {
		changeTable,
		deleteTable,
		getTableSize,
		leaveTable,
		type CellCoordinates
	} from './tableEditor.js';
	import type { TableNode } from './TableNode.js';

	interface Props {
		parentEditor: LexicalEditor;
		lexicalTable: TableNode;
		mdastNode: Mdast.Table;
	}

	let { parentEditor, lexicalTable, mdastNode }: Props = $props();

	const readOnly = useCellValue(readOnly$);
	const t = useTranslation();

	const tableKey = $derived(lexicalTable.getKey());
	const colCount = $derived(mdastNode.children[0]?.children.length ?? 0);
	const rowCount = $derived(mdastNode.children.length);

	let activeCell = $state.raw<CellCoordinates | null>(null);
	let highlightedCoordinates = $state.raw<CellCoordinates>([-1, -1]);

	const alignClasses = {
		center: 'sd-centered-cell',
		left: 'sd-left-aligned-cell',
		right: 'sd-right-aligned-cell'
	};
	const alignClass = (align: Mdast.AlignType | undefined) => alignClasses[align ?? 'left'];

	function getCellKey(cell: Mdast.TableCell & { __cacheKey?: string }) {
		cell.__cacheKey ??= uuidv4();
		return cell.__cacheKey;
	}

	function setActiveCellWithBoundaries(cell: CellCoordinates | null) {
		if (cell === null) {
			activeCell = null;
			return;
		}
		// The props lag behind structural changes until the next render.
		const [columns, rows] = getTableSize(parentEditor, tableKey);
		let [colIndex, rowIndex] = cell;

		if (colIndex > columns - 1) {
			colIndex = 0;
			rowIndex++;
		}
		if (colIndex < 0) {
			colIndex = columns - 1;
			rowIndex -= 1;
		}
		if (rowIndex > rows - 1) {
			activeCell = null;
			leaveTable(parentEditor, tableKey, 'next');
			return;
		}
		if (rowIndex < 0) {
			activeCell = null;
			leaveTable(parentEditor, tableKey, 'previous');
			return;
		}
		activeCell = [colIndex, rowIndex];
	}

	$effect(() => {
		lexicalTable.focusEmitter.subscribe(setActiveCellWithBoundaries);
	});

	function addRowToBottom(event: MouseEvent) {
		event.preventDefault();
		changeTable(
			parentEditor,
			tableKey,
			(table) => {
				const next: CellCoordinates = [0, table.getRowCount()];
				table.addRowToBottom();
				return next;
			},
			(next) => {
				activeCell = next;
			}
		);
	}

	function addColumnToRight(event: MouseEvent) {
		event.preventDefault();
		changeTable(
			parentEditor,
			tableKey,
			(table) => {
				const next: CellCoordinates = [table.getColCount(), 0];
				table.addColumnToRight();
				return next;
			},
			(next) => {
				activeCell = next;
			}
		);
	}

	function onTableMouseOver(event: MouseEvent & { currentTarget: HTMLTableElement }) {
		let cell = event.target as HTMLElement | null;
		while (cell && !['TH', 'TD'].includes(cell.tagName)) {
			if (cell === event.currentTarget) return;
			cell = cell.parentElement;
		}
		if (cell === null) return;
		const row = cell.parentElement as HTMLElement;
		const container = row.parentElement as HTMLElement;
		const colIndex = container.tagName === 'TFOOT' ? -1 : Array.from(row.children).indexOf(cell);
		const rowIndex = cell.tagName === 'TH' ? -1 : Array.from(container.children).indexOf(row);
		highlightedCoordinates = [colIndex, rowIndex];
	}
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<table
	class="sd-table-editor"
	onmouseover={onTableMouseOver}
	onmouseleave={() => {
		highlightedCoordinates = [-1, -1];
	}}
>
	<colgroup>
		{#if !readOnly.current}<col />{/if}
		{#each { length: colCount }, colIndex (colIndex)}
			<col class={alignClass(mdastNode.align?.[colIndex])} />
		{/each}
		{#if !readOnly.current}<col />{/if}
	</colgroup>

	{#if !readOnly.current}
		<thead>
			<tr>
				<th class="sd-table-tools-column"></th>
				{#each { length: colCount }, colIndex (colIndex)}
					<th data-tool-cell={true}>
						<ColumnEditor
							{parentEditor}
							{tableKey}
							{colIndex}
							{highlightedCoordinates}
							setActiveCell={setActiveCellWithBoundaries}
							align={mdastNode.align?.[colIndex]}
						/>
					</th>
				{/each}
				<th class="sd-table-tools-column" data-tool-cell={true}>
					<button
						class="sd-icon-button"
						type="button"
						title={t('table.deleteTable', 'Delete table')}
						onclick={(event) => {
							event.preventDefault();
							deleteTable(parentEditor, tableKey);
						}}
					>
						<Icon name="delete_small" />
					</button>
				</th>
			</tr>
		</thead>
	{/if}

	<tbody>
		{#each mdastNode.children as row, rowIndex (rowIndex)}
			{@const cellTag = rowIndex === 0 ? 'th' : 'td'}
			<tr>
				{#if !readOnly.current}
					<svelte:element this={cellTag} class="sd-tool-cell" data-tool-cell={true}>
						<RowEditor
							{parentEditor}
							{tableKey}
							{rowIndex}
							{highlightedCoordinates}
							setActiveCell={setActiveCellWithBoundaries}
						/>
					</svelte:element>
				{/if}
				{#each row.children as cell, colIndex (getCellKey(cell))}
					{@const isActive =
						!readOnly.current && activeCell?.[0] === colIndex && activeCell[1] === rowIndex}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<svelte:element
						this={cellTag}
						class={alignClass(mdastNode.align?.[colIndex])}
						data-active={isActive}
						onclick={() => {
							setActiveCellWithBoundaries([colIndex, rowIndex]);
						}}
					>
						<CellEditor
							{parentEditor}
							{tableKey}
							{colIndex}
							{rowIndex}
							contents={cell.children}
							focus={isActive}
							setActiveCell={setActiveCellWithBoundaries}
						/>
					</svelte:element>
				{/each}
				{#if !readOnly.current && rowIndex === 0}
					<th rowspan={rowCount} data-tool-cell={true}>
						<button type="button" class="sd-add-column-button" onclick={addColumnToRight}>
							<Icon name="add_column" />
						</button>
					</th>
				{/if}
			</tr>
		{/each}
	</tbody>

	{#if !readOnly.current}
		<tfoot>
			<tr>
				<th></th>
				<th colspan={colCount} data-tool-cell={true}>
					<button type="button" class="sd-add-row-button" onclick={addRowToBottom}>
						<Icon name="add_row" />
					</button>
				</th>
				<th></th>
			</tr>
		</tfoot>
	{/if}
</table>
