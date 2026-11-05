<!-- @component Inserts a thematic break. Needs the `thematicBreakPlugin`. -->
<script lang="ts">
	import { usePublisher } from '../../../realm/hooks.js';
	import Icon from '../../../ui/Icon.svelte';
	import { useTranslation } from '../../core/hooks.js';
	import { insertThematicBreak$ } from '../../thematic-break/index.js';
	import ButtonWithTooltip from '../primitives/ButtonWithTooltip.svelte';

	const insertThematicBreak = usePublisher(insertThematicBreak$);
	const t = useTranslation();
</script>

<ButtonWithTooltip
	title={t('toolbar.thematicBreak', 'Insert thematic break')}
	onclick={() => insertThematicBreak()}
>
	<Icon name="horizontal_rule" />
</ButtonWithTooltip>
