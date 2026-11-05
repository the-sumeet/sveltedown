<!--
	@component
	A nested editor for markdown nodes that have markdown content of their own, such as custom
	directives or JSX elements. Render it inside `NestedEditorsProvider`.
-->
<script lang="ts" generics="T extends Mdast.RootContent">
	import { getAllContexts, onMount } from 'svelte';
	import type { LexicalEditorWithDispose } from 'lexical';
	import type * as Mdast from 'mdast';
	import { useCellValue, useRealm } from '../../realm/hooks.js';
	import { attachEditorSurface } from './editorSurface.js';
	import { nestedEditorChildren$ } from './index.js';
	import { createNestedEditor, registerNestedEditor } from './nestedEditor.js';
	import {
		useLexicalNodeRemove,
		useMdastNodeUpdater,
		useNestedEditorContext
	} from './nestedEditorContext.js';

	interface Props {
		/**
		 * Returns the content of the mdast node. In most cases, this is its `children`, but a node
		 * can also have several nested parts with their own children.
		 */
		getContent: (mdastNode: T) => Mdast.RootContent[];
		/** Returns the updated mdast node, given the original node and the editor's new content. */
		getUpdatedMdastNode: (mdastNode: T, children: Mdast.RootContent[]) => T;
		/** Class of the `contenteditable` element. */
		contentEditableClass?: string;
		/** Whether the editor edits blocks (multiple paragraphs). */
		block?: boolean;
	}

	let { getContent, getUpdatedMdastNode, contentEditableClass, block = false }: Props = $props();

	const realm = useRealm();
	const context = useNestedEditorContext<T>();
	const updateMdastNode = useMdastNodeUpdater<T>();
	const removeNode = useLexicalNodeRemove();
	const contexts = getAllContexts();
	const children = useCellValue(nestedEditorChildren$);

	let element: HTMLDivElement;
	let editor = $state.raw<LexicalEditorWithDispose | null>(null);

	onMount(() => {
		// The editor keeps the configuration it was mounted with.
		const options = {
			realm,
			context,
			block,
			getContent: (node: T) => getContent(node),
			getUpdatedMdastNode: (node: T, content: Mdast.RootContent[]) =>
				getUpdatedMdastNode(node, content),
			updateMdastNode,
			removeNode
		};
		const nested = createNestedEditor(options);
		const unregister = registerNestedEditor(nested, options);
		const detach = attachEditorSurface(nested, element, contexts);
		editor = nested;

		return () => {
			editor = null;
			unregister();
			detach();
			nested.dispose();
		};
	});
</script>

<div bind:this={element} class={['sd-nested-editor', contentEditableClass]}></div>
{#if editor}
	{#each children.current as Child, index (index)}
		<Child />
	{/each}
{/if}
