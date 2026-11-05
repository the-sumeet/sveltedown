<!-- @component Lets the user toggle inline code formatting. -->
<script lang="ts">
	import { IS_CODE } from '../../../FormatConstants.js';
	import { useCellValue, usePublisher } from '../../../realm/hooks.js';
	import { useTranslation } from '../../core/hooks.js';
	import { applyFormat$, currentFormat$ } from '../../core/index.js';
	import MultipleChoiceToggleGroup from '../primitives/MultipleChoiceToggleGroup.svelte';

	const currentFormat = useCellValue(currentFormat$);
	const applyFormat = usePublisher(applyFormat$);
	const t = useTranslation();
	const on = $derived((currentFormat.current & IS_CODE) !== 0);
</script>

<MultipleChoiceToggleGroup
	items={[
		{
			title: on
				? t('toolbar.removeInlineCode', 'Remove code format')
				: t('toolbar.inlineCode', 'Inline code format'),
			icon: 'code',
			active: on,
			onChange: () => applyFormat('code')
		}
	]}
/>
