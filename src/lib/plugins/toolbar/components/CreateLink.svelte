<!-- @component Opens the link edit dialog. Needs the `linkDialogPlugin`. -->
<script lang="ts">
	import { usePublisher } from '../../../realm/hooks.js';
	import Icon from '../../../ui/Icon.svelte';
	import { useTranslation } from '../../core/hooks.js';
	import { openLinkEditDialog$ } from '../../link-dialog/index.js';
	import ButtonWithTooltip from '../primitives/ButtonWithTooltip.svelte';

	const openLinkDialog = usePublisher(openLinkEditDialog$);
	const t = useTranslation();
</script>

<ButtonWithTooltip
	title={t('toolbar.link', 'Create link')}
	onpointerdown={(event: PointerEvent) => event.preventDefault()}
	onclick={() => openLinkDialog()}
>
	<Icon name="link" />
</ButtonWithTooltip>
