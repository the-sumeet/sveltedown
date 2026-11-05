<!--
	@component
	Provides the context that `NestedLexicalEditor` and the nested editor hooks read. Place it as a
	wrapper in the decorators of your custom lexical nodes.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { EditorConfig, LexicalEditor } from 'lexical';
	import type { Node } from 'unist';
	import type { VoidEmitter } from '../../utils/voidEmitter.js';
	import { setNestedEditorsContext, type MdastEditableNode } from './nestedEditorContext.js';

	interface Props {
		parentEditor: LexicalEditor;
		config: EditorConfig;
		mdastNode: Node;
		lexicalNode: MdastEditableNode;
		focusEmitter: VoidEmitter;
		children: Snippet;
	}

	let props: Props = $props();

	setNestedEditorsContext({
		get parentEditor() {
			return props.parentEditor;
		},
		get config() {
			return props.config;
		},
		get mdastNode() {
			return props.mdastNode;
		},
		get lexicalNode() {
			return props.lexicalNode;
		},
		get focusEmitter() {
			return props.focusEmitter;
		}
	});
</script>

{@render props.children()}
