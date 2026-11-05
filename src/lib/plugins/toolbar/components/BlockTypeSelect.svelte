<!-- @component Lets the user change the block type: paragraph, headings and block quotes. -->
<script lang="ts">
	import { useCellValue, usePublisher } from '../../../realm/hooks.js';
	import { useTranslation } from '../../core/hooks.js';
	import {
		activePlugins$,
		convertSelectionToNode$,
		currentBlockType$,
		type BlockType
	} from '../../core/index.js';
	import { allowedHeadingLevels$ } from '../../headings/index.js';
	import Select from '../primitives/Select.svelte';
	import { blockNodeFactory } from './blockTypes.js';

	const convertSelectionToNode = usePublisher(convertSelectionToNode$);
	const currentBlockType = useCellValue(currentBlockType$);
	const activePlugins = useCellValue(activePlugins$);
	const allowedHeadingLevels = useCellValue(allowedHeadingLevels$);
	const t = useTranslation();

	const hasQuote = $derived(activePlugins.current.includes('quote'));
	const hasHeadings = $derived(activePlugins.current.includes('headings'));
	const items = $derived.by(() => {
		const result: { label: string; value: BlockType }[] = [
			{ label: t('toolbar.blockTypes.paragraph', 'Paragraph'), value: 'paragraph' }
		];
		if (hasQuote) result.push({ label: t('toolbar.blockTypes.quote', 'Quote'), value: 'quote' });
		if (hasHeadings) {
			for (const level of allowedHeadingLevels.current) {
				result.push({
					label: t('toolbar.blockTypes.heading', 'Heading {{level}}', { level }),
					value: `h${level}`
				});
			}
		}
		return result;
	});
</script>

{#if hasQuote || hasHeadings}
	<Select
		value={currentBlockType.current}
		onChange={(blockType) => {
			convertSelectionToNode(blockNodeFactory(blockType));
		}}
		triggerTitle={t('toolbar.blockTypeSelect.selectBlockTypeTooltip', 'Select block type')}
		placeholder={t('toolbar.blockTypeSelect.placeholder', 'Block type')}
		{items}
	/>
{/if}
