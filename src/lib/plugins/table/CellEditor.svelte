<script lang="ts">
	import { getAllContexts, onMount, untrack } from 'svelte';
	import type { LexicalEditor } from 'lexical';
	import type * as Mdast from 'mdast';
	import { useCellValue, useRealm } from '../../realm/hooks.js';
	import { attachEditorSurface } from '../core/editorSurface.js';
	import { setLexicalEditorContext } from '../core/hooks.js';
	import { tableCellEditorChildren$ } from '../core/index.js';
	import {
		createCellEditor,
		registerCellEditor,
		restoreCellContents,
		type CellCoordinates
	} from './tableEditor.js';

	interface Props {
		parentEditor: LexicalEditor;
		tableKey: string;
		contents: Mdast.PhrasingContent[];
		colIndex: number;
		rowIndex: number;
		focus: boolean;
		setActiveCell: (cell: CellCoordinates | null) => void;
	}

	let props: Props = $props();

	const realm = useRealm();
	const children = useCellValue(tableCellEditorChildren$);
	const persisted = { current: untrack(() => props.contents) };

	// The editor keeps the configuration it was mounted with.
	const editor = untrack(() => createCellEditor(realm, props.parentEditor, props.contents));
	setLexicalEditorContext(editor);
	const contexts = getAllContexts();

	let element: HTMLDivElement;

	onMount(() => {
		const unregister = registerCellEditor(
			editor,
			realm,
			{
				get parentEditor() {
					return props.parentEditor;
				},
				get tableKey() {
					return props.tableKey;
				},
				get colIndex() {
					return props.colIndex;
				},
				get rowIndex() {
					return props.rowIndex;
				},
				get focus() {
					return props.focus;
				},
				setActiveCell: (cell) => {
					props.setActiveCell(cell);
				},
				onSaved: () => {
					saves++;
				}
			},
			persisted
		);
		const detach = attachEditorSurface(editor, element, contexts);
		return () => {
			unregister();
			detach();
			editor.dispose();
		};
	});

	// A save and a parent undo can both land before the next render, leaving the contents prop
	// unchanged. Checking again after each save restores the cell in that case too.
	let saves = $state(0);

	$effect(() => {
		void saves;
		restoreCellContents(editor, realm, props.contents, persisted);
	});

	$effect(() => {
		if (props.focus) editor.focus();
	});
</script>

<div bind:this={element}></div>
{#each children.current as Child, index (index)}
	<Child />
{/each}
