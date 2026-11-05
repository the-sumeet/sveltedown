<script lang="ts">
	import type { EditorConfig, LexicalEditor } from 'lexical';
	import { useCellValue } from '../../realm/hooks.js';
	import type { VoidEmitter } from '../../utils/voidEmitter.js';
	import { jsxComponentDescriptors$ } from '../core/index.js';
	import NestedEditorsProvider from '../core/NestedEditorsProvider.svelte';
	import type { MdastJsx } from './index.js';
	import type { LexicalJsxNode } from './LexicalJsxNode.js';

	interface Props {
		parentEditor: LexicalEditor;
		lexicalJsxNode: LexicalJsxNode;
		mdastNode: MdastJsx;
		config: EditorConfig;
		focusEmitter: VoidEmitter;
	}

	let { parentEditor, lexicalJsxNode, mdastNode, config, focusEmitter }: Props = $props();

	const descriptors = useCellValue(jsxComponentDescriptors$);
	const descriptor = $derived.by(() => {
		const found =
			descriptors.current.find((candidate) => candidate.name === mdastNode.name) ??
			descriptors.current.find((candidate) => candidate.name === '*');
		if (!found) throw new Error(`No JSX descriptor found for ${mdastNode.name}`);
		return found;
	});
	const Editor = $derived(descriptor.Editor);
</script>

<NestedEditorsProvider
	{parentEditor}
	{config}
	{mdastNode}
	lexicalNode={lexicalJsxNode}
	{focusEmitter}
>
	<Editor {descriptor} {mdastNode} />
</NestedEditorsProvider>
