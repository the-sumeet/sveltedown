<!-- @component Inserts an image. Needs the `imagePlugin`. -->
<script lang="ts">
	import { useCellValue, usePublisher } from '../../../realm/hooks.js';
	import Icon from '../../../ui/Icon.svelte';
	import { useTranslation } from '../../core/hooks.js';
	import { readOnly$ } from '../../core/index.js';
	import { openNewImageDialog$ } from '../../image/index.js';
	import ButtonWithTooltip from '../primitives/ButtonWithTooltip.svelte';

	const openNewImageDialog = usePublisher(openNewImageDialog$);
	const readOnly = useCellValue(readOnly$);
	const t = useTranslation();
</script>

<ButtonWithTooltip
	title={t('toolbar.image', 'Insert image')}
	disabled={readOnly.current}
	onclick={() => openNewImageDialog()}
>
	<Icon name="add_photo" />
</ButtonWithTooltip>
