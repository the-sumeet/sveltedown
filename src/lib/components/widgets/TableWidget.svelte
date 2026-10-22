<script lang="ts">
	import { EditorView } from '@codemirror/view';
	import type { TableCellData, TableData } from '../../cm/utils/tables.js';
	import { findNodeAt } from '../../cm/utils/syntax.js';
	import { caretAt, onScrollbar, textOffset } from '../../cm/utils/dom.js';
	import { openLink } from '../../cm/utils/links.js';

	let { table, view }: { table: TableData; view: EditorView } = $props();

	let scroller: HTMLDivElement;

	/** Source position for a click: the clicked character, or the end of the clicked cell. */
	function sourcePos(event: MouseEvent): number | null {
		const tableNode = findNodeAt(view.state, view.posAtDOM(scroller), 'Table');
		if (!tableNode) return null;
		const caret = caretAt(event);
		const element =
			caret && (caret.node instanceof Element ? caret.node : caret.node.parentElement);
		const segment = element?.closest<HTMLElement>('[data-from]');
		if (caret && segment && scroller.contains(segment)) {
			return (
				tableNode.from +
				Number(segment.dataset.from) +
				textOffset(segment, caret.node, caret.offset)
			);
		}
		const cell = (event.target as Element).closest<HTMLElement>('[data-cell-to]');
		return tableNode.from + (cell ? Number(cell.dataset.cellTo) : 0);
	}

	// The editor ignores events in here (see `data-widget-interactive`), so scrolling and
	// text selection work natively. A plain click opens the table's source with the cursor
	// where the user clicked; Mod-click (or any click when read-only) follows links.
	function onclick(event: MouseEvent) {
		const editable = view.state.facet(EditorView.editable);
		const link = (event.target as Element).closest<HTMLElement>('[data-url]');
		if (link && (event.metaKey || event.ctrlKey || !editable)) {
			event.preventDefault();
			openLink(link.dataset.url!);
			return;
		}
		if (!editable || !window.getSelection()?.isCollapsed || onScrollbar(scroller, event)) return;
		const pos = sourcePos(event);
		if (pos === null) return;
		// Focus first: a blurred editor doesn't write its selection to the DOM, and on focus
		// it would read back the stale browser selection from the widget we clicked.
		view.focus();
		view.dispatch({
			selection: { anchor: pos },
			scrollIntoView: true,
			userEvent: 'select.pointer'
		});
	}
</script>

{#snippet content(cell: TableCellData)}
	{#each cell.segments as s (s.from)}<span
			data-from={s.from}
			data-url={s.href}
			class={{
				'cm-md-strong': s.strong,
				'cm-md-em': s.em,
				'cm-md-strikethrough': s.strike,
				'cm-md-code': s.code,
				'cm-md-link': s.href
			}}>{s.text}</span
		>{/each}
{/snippet}

<!-- tabindex="-1": pressing here focuses this element rather than the editor, which would
     otherwise restore its own selection and break native text selection. Keyboard users
     reach the table by moving the editor cursor into it. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
	bind:this={scroller}
	class="cm-md-table-scroll"
	tabindex="-1"
	data-widget-interactive
	{onclick}
>
	<table>
		<thead>
			<tr>
				{#each table.header as cell, i (i)}
					<th style:text-align={table.align[i]} data-cell-to={cell.to}>{@render content(cell)}</th>
				{/each}
			</tr>
		</thead>
		{#if table.rows.length}
			<tbody>
				{#each table.rows as row, r (r)}
					<tr>
						{#each row as cell, i (i)}
							<td style:text-align={table.align[i]} data-cell-to={cell.to}
								>{@render content(cell)}</td
							>
						{/each}
					</tr>
				{/each}
			</tbody>
		{/if}
	</table>
</div>
