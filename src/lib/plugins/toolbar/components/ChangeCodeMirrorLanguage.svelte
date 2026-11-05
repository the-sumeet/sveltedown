<!-- @component Changes the language of the focused code block. Needs the `codeMirrorPlugin`. -->
<script lang="ts">
	import { useCellValue } from '../../../realm/hooks.js';
	import { asCodeBlockNode } from './codeBlockInFocus.js';
	import {
		EMPTY_VALUE,
		codeBlockLanguages$,
		getCodeBlockLanguageSelectData
	} from '../../codemirror/index.js';
	import { useTranslation } from '../../core/hooks.js';
	import { activeEditor$, editorInFocus$ } from '../../core/index.js';
	import Select from '../primitives/Select.svelte';

	const editorInFocus = useCellValue(editorInFocus$);
	const activeEditor = useCellValue(activeEditor$);
	const languages = useCellValue(codeBlockLanguages$);
	const t = useTranslation();

	const node = $derived(asCodeBlockNode(editorInFocus.current?.rootNode));
	const data = $derived(
		node ? getCodeBlockLanguageSelectData(languages.current, node.getLanguage()) : null
	);

	function change(language: string) {
		const editor = activeEditor.current;
		const target = node;
		if (!target) return;
		editor?.update(() => {
			target.setLanguage(language === EMPTY_VALUE ? '' : language);
			setTimeout(() => {
				editor.update(() => {
					target.getLatest().select();
				});
			});
		});
	}
</script>

{#if data}
	<div class="sd-select-with-label">
		<span>{t('codeBlock.language', 'Code block language')}</span>
		<Select
			value={data.value || EMPTY_VALUE}
			onChange={change}
			triggerTitle={t('codeBlock.selectLanguage', 'Select code block language')}
			placeholder={t('codeBlock.language', 'Code block language')}
			items={data.items}
		/>
	</div>
{/if}
