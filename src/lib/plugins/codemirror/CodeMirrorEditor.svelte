<script lang="ts">
	import type { EditorView } from '@codemirror/view';
	import { untrack } from 'svelte';
	import { useCellValue, usePublisher } from '../../realm/hooks.js';
	import Icon from '../../ui/Icon.svelte';
	import { useCodeBlockEditorContext } from '../codeblock/codeBlockEditorContext.js';
	import type { CodeBlockEditorProps } from '../codeblock/index.js';
	import { useTranslation } from '../core/hooks.js';
	import { activeEditor$, editorInFocus$, readOnly$ } from '../core/index.js';
	import Select from '../toolbar/primitives/Select.svelte';
	import { attachCodeMirrorKeyboard, createCodeMirrorView } from './codeMirrorView.js';
	import {
		EMPTY_VALUE,
		codeBlockLanguages$,
		codeMirrorAutoLoadLanguageSupport$,
		codeMirrorExtensions$,
		getCodeBlockLanguageSelectData
	} from './index.js';

	let { language, nodeKey, code, focusEmitter }: CodeBlockEditorProps = $props();

	const t = useTranslation();
	const editorContext = useCodeBlockEditorContext();
	const readOnly = useCellValue(readOnly$);
	const extensions = useCellValue(codeMirrorExtensions$);
	const autoLoad = useCellValue(codeMirrorAutoLoadLanguageSupport$);
	const codeBlockLanguages = useCellValue(codeBlockLanguages$);
	const activeEditor = useCellValue(activeEditor$);
	const setEditorInFocus = usePublisher(editorInFocus$);

	let element: HTMLDivElement;
	let view = $state.raw<EditorView | null>(null);

	const selectData = $derived(getCodeBlockLanguageSelectData(codeBlockLanguages.current, language));

	const onFocus = () => {
		setEditorInFocus({
			editorType: 'codeblock',
			rootNode: editorContext.lexicalNode,
			editorRef: view
		});
	};

	$effect(() => {
		const options = {
			element,
			language,
			readOnly: readOnly.current,
			extensions: extensions.current,
			languages: untrack(() => codeBlockLanguages.current),
			autoLoadLanguageSupport: untrack(() => autoLoad.current),
			code: untrack(() => code),
			parentEditor: untrack(() => editorContext.parentEditor),
			onChange: (next: string) => {
				editorContext.setCode(next);
			}
		};
		return createCodeMirrorView(options, (created) => {
			view = created;
		});
	});

	$effect(() => {
		if (!view) return;
		return attachCodeMirrorKeyboard(
			view,
			nodeKey,
			() => untrack(() => activeEditor.current),
			onFocus
		);
	});

	$effect(() => {
		const current = view;
		focusEmitter.subscribe(() => {
			current?.focus();
			onFocus();
		});
	});

	function changeLanguage(next: string) {
		const { parentEditor, lexicalNode } = editorContext;
		parentEditor.update(() => {
			lexicalNode.setLanguage(next === EMPTY_VALUE ? '' : next);
			setTimeout(() => {
				parentEditor.update(() => {
					lexicalNode.getLatest().select();
				});
			});
		});
	}
</script>

<div class="sd-code-mirror-wrapper">
	<div class="sd-code-mirror-toolbar">
		<Select
			disabled={readOnly.current}
			value={selectData.value}
			onChange={changeLanguage}
			triggerTitle={t('codeBlock.selectLanguage', 'Select code block language')}
			placeholder={t('codeBlock.inlineLanguage', 'Language')}
			items={selectData.items}
		/>
		<button
			class="sd-icon-button"
			type="button"
			disabled={readOnly.current}
			title={t('codeblock.delete', 'Delete code block')}
			onclick={(event) => {
				event.preventDefault();
				const { parentEditor, lexicalNode } = editorContext;
				parentEditor.update(() => {
					lexicalNode.remove();
				});
			}}
		>
			<Icon name="delete_small" />
		</button>
	</div>
	<div bind:this={element}></div>
</div>
