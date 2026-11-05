<script lang="ts">
	import type { EditorConfig, LexicalEditor } from 'lexical';
	import type { Directives } from 'mdast-util-directive';
	import { useCellValue } from '../../realm/hooks.js';
	import type { VoidEmitter } from '../../utils/voidEmitter.js';
	import { directiveDescriptors$ } from '../core/index.js';
	import NestedEditorsProvider from '../core/NestedEditorsProvider.svelte';
	import type { DirectiveNode } from './DirectiveNode.js';

	interface Props {
		parentEditor: LexicalEditor;
		lexicalNode: DirectiveNode;
		mdastNode: Directives;
		config: EditorConfig;
		focusEmitter: VoidEmitter;
	}

	let { parentEditor, lexicalNode, mdastNode, config, focusEmitter }: Props = $props();

	const descriptors = useCellValue(directiveDescriptors$);
	const descriptor = $derived.by(() => {
		const found = descriptors.current.find((candidate) => candidate.testNode(mdastNode));
		if (!found) throw new Error(`No descriptor found for directive ${mdastNode.name}`);
		return found;
	});
	const Editor = $derived(descriptor.Editor);
</script>

<NestedEditorsProvider {parentEditor} {config} {mdastNode} {lexicalNode} {focusEmitter}>
	<Editor {descriptor} {mdastNode} {lexicalNode} {parentEditor} />
</NestedEditorsProvider>
