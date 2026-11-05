<script lang="ts">
	import type { LexicalEditor } from 'lexical';
	import { useCellValue } from '../../realm/hooks.js';
	import type { VoidEmitter } from '../../utils/voidEmitter.js';
	import { codeBlockEditorDescriptors$, defaultCodeBlockLanguage$ } from '../core/index.js';
	import { setCodeBlockEditorContext } from './codeBlockEditorContext.js';
	import type { CodeBlockNode } from './CodeBlockNode.js';
	import { findCodeBlockDescriptor } from './findCodeBlockDescriptor.js';

	interface Props {
		parentEditor: LexicalEditor;
		codeBlockNode: CodeBlockNode;
		code: string;
		language: string;
		meta: string;
		nodeKey: string;
		focusEmitter: VoidEmitter;
	}

	let props: Props = $props();

	const descriptors = useCellValue(codeBlockEditorDescriptors$);
	const defaultLanguage = useCellValue(defaultCodeBlockLanguage$);

	setCodeBlockEditorContext({
		get parentEditor() {
			return props.parentEditor;
		},
		get codeBlockNode() {
			return props.codeBlockNode;
		}
	});

	const Editor = $derived.by(() => {
		const descriptor = findCodeBlockDescriptor(
			descriptors.current,
			props.language,
			props.meta,
			defaultLanguage.current
		);
		if (!descriptor) {
			throw new Error(
				`No CodeBlockEditor registered for language=${props.language} meta=${props.meta}`
			);
		}
		return descriptor.Editor;
	});
</script>

<Editor
	code={props.code}
	language={props.language}
	meta={props.meta}
	nodeKey={props.nodeKey}
	focusEmitter={props.focusEmitter}
/>
