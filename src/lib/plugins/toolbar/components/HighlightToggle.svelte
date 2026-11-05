<!-- @component Lets the user toggle highlight formatting. -->
<script lang="ts">
	import { IS_HIGHLIGHT } from '../../../FormatConstants.js';
	import { useCellValue, usePublisher } from '../../../realm/hooks.js';
	import { useTranslation } from '../../core/hooks.js';
	import { applyFormat$, currentFormat$ } from '../../core/index.js';
	import MultipleChoiceToggleGroup from '../primitives/MultipleChoiceToggleGroup.svelte';

	const currentFormat = useCellValue(currentFormat$);
	const applyFormat = usePublisher(applyFormat$);
	const t = useTranslation();
	const on = $derived((currentFormat.current & IS_HIGHLIGHT) !== 0);
</script>

<MultipleChoiceToggleGroup
	items={[
		{
			title: on
				? t('toolbar.removeHighlight', 'Remove highlight')
				: t('toolbar.highlight', 'Highlight'),
			icon: 'format_highlight',
			active: on,
			onChange: () => applyFormat('highlight')
		}
	]}
/>
