<script lang="ts">
	import type { EditorConfig, LexicalEditor } from 'lexical';
	import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
	import type { RootContent } from 'mdast';
	import { NestedEditorsProvider, NestedLexicalEditor, type MdastEditableNode } from '#lib';
	import type { VoidEmitter } from '#lib';

	interface Props {
		parentEditor: LexicalEditor;
		config: EditorConfig;
		mdastNode: MdxJsxFlowElement;
		lexicalNode: MdastEditableNode;
		focusEmitter: VoidEmitter;
	}

	let { parentEditor, config, mdastNode, lexicalNode, focusEmitter }: Props = $props();
</script>

<NestedEditorsProvider {parentEditor} {config} {mdastNode} {lexicalNode} {focusEmitter}>
	<NestedLexicalEditor
		block
		getContent={(node: MdxJsxFlowElement) => node.children as RootContent[]}
		getUpdatedMdastNode={(node: MdxJsxFlowElement, children: RootContent[]) =>
			({ ...node, children }) as MdxJsxFlowElement}
	/>
</NestedEditorsProvider>
