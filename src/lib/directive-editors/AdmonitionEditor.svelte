<script lang="ts">
	import type { AdmonitionKind } from 'lexical';
	import type { ContainerDirective } from 'mdast-util-directive';
	import type { RootContent } from 'mdast';
	import NestedLexicalEditor from '../plugins/core/NestedLexicalEditor.svelte';
	import { useNestedEditorContext } from '../plugins/core/nestedEditorContext.js';
	import type { DirectiveEditorProps } from '../plugins/directives/index.js';

	let { mdastNode }: DirectiveEditorProps = $props();

	const context = useNestedEditorContext();
	const className = $derived(context.config.theme.admonition?.[mdastNode.name as AdmonitionKind]);
</script>

<div class={className}>
	<NestedLexicalEditor
		block
		getContent={(node: ContainerDirective) => node.children as RootContent[]}
		getUpdatedMdastNode={(node: ContainerDirective, children: RootContent[]) =>
			({ ...node, children }) as ContainerDirective}
	/>
</div>
