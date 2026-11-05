<!-- @component Changes the admonition type. Needs `AdmonitionDirectiveDescriptor` in the `directivesPlugin`. -->
<script lang="ts">
	import type { AdmonitionKind } from '../../../directive-editors/AdmonitionDirectiveDescriptor.js';
	import { ADMONITION_TYPES } from '../../../directive-editors/AdmonitionDirectiveDescriptor.js';
	import { useCellValue } from '../../../realm/hooks.js';
	import { useTranslation } from '../../core/hooks.js';
	import { editorInFocus$, rootEditor$ } from '../../core/index.js';
	import type { DirectiveNode } from '../../directives/DirectiveNode.js';
	import Select from '../primitives/Select.svelte';
	import { admonitionLabelsMap } from './admonitionLabels.js';

	const editorInFocus = useCellValue(editorInFocus$);
	const rootEditor = useCellValue(rootEditor$);
	const t = useTranslation();

	const node = $derived(editorInFocus.current?.rootNode as DirectiveNode | null | undefined);
	const labels = $derived(admonitionLabelsMap(t));
</script>

{#if node}
	<Select
		value={node.getMdastNode().name as AdmonitionKind}
		onChange={(name) => {
			const editor = rootEditor.current;
			const target = node;
			editor?.update(() => {
				target.setMdastNode({ ...target.getMdastNode(), name });
				setTimeout(() => {
					editor.update(() => {
						target.getLatest().select();
					});
				}, 80);
			});
		}}
		triggerTitle={t('admonitions.changeType', 'Select admonition type')}
		placeholder={t('admonitions.placeholder', 'Admonition type')}
		items={ADMONITION_TYPES.map((type) => ({ label: labels[type], value: type }))}
	/>
{/if}
