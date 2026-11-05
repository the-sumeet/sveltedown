<!-- @component A universal editor for any directive: its content and its attributes. -->
<script lang="ts">
	import type { RootContent } from 'mdast';
	import type { Directives } from 'mdast-util-directive';
	import { useMdastNodeUpdater } from '../plugins/core/nestedEditorContext.js';
	import NestedLexicalEditor from '../plugins/core/NestedLexicalEditor.svelte';
	import PropertyPopover from '../plugins/core/PropertyPopover.svelte';
	import type { DirectiveEditorProps } from '../plugins/directives/index.js';

	let { mdastNode, descriptor }: DirectiveEditorProps = $props();

	const updateMdastNode = useMdastNodeUpdater<Directives>();

	const properties = $derived(
		Object.fromEntries(
			descriptor.attributes.map((name) => [name, mdastNode.attributes?.[name] ?? ''])
		) as Record<string, string>
	);
</script>

<div class={mdastNode.type === 'textDirective' ? 'sd-inline-editor' : 'sd-block-editor'}>
	{#if descriptor.attributes.length === 0 && descriptor.hasChildren && mdastNode.type !== 'textDirective'}
		<span class="sd-generic-component-name">{mdastNode.name}</span>
	{/if}

	{#if descriptor.attributes.length > 0}
		<PropertyPopover
			{properties}
			title={mdastNode.name || ''}
			onChange={(values) => {
				updateMdastNode({
					attributes: Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''))
				});
			}}
		/>
	{/if}

	{#if descriptor.hasChildren}
		<NestedLexicalEditor
			block={mdastNode.type === 'containerDirective'}
			getContent={(node: Directives) => node.children as RootContent[]}
			getUpdatedMdastNode={(node: Directives, children: RootContent[]) =>
				({ ...node, children }) as Directives}
		/>
	{:else}
		<span class="sd-generic-component-name">{mdastNode.name}</span>
	{/if}
</div>
