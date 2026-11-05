<!-- @component Inserts a fenced code block. Needs the `codeBlockPlugin`. -->
<script lang="ts">
	import { usePublisher } from '../../../realm/hooks.js';
	import Icon from '../../../ui/Icon.svelte';
	import { insertCodeBlock$ } from '../../codeblock/index.js';
	import { useTranslation } from '../../core/hooks.js';
	import ButtonWithTooltip from '../primitives/ButtonWithTooltip.svelte';

	const insertCodeBlock = usePublisher(insertCodeBlock$);
	const t = useTranslation();
</script>

<ButtonWithTooltip
	title={t('toolbar.codeBlock', 'Insert Code Block')}
	onclick={() => insertCodeBlock({})}
>
	<Icon name="frame_source" />
</ButtonWithTooltip>
