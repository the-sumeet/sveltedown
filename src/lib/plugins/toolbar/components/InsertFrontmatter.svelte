<!-- @component Inserts or edits the frontmatter. Needs the `frontmatterPlugin`. -->
<script lang="ts">
	import { useCellValue, usePublisher } from '../../../realm/hooks.js';
	import Icon from '../../../ui/Icon.svelte';
	import { useTranslation } from '../../core/hooks.js';
	import { hasFrontmatter$, insertFrontmatter$ } from '../../frontmatter/index.js';
	import ButtonWithTooltip from '../primitives/ButtonWithTooltip.svelte';

	const insertFrontmatter = usePublisher(insertFrontmatter$);
	const hasFrontmatter = useCellValue(hasFrontmatter$);
	const t = useTranslation();
</script>

<ButtonWithTooltip
	title={hasFrontmatter.current
		? t('toolbar.editFrontmatter', 'Edit frontmatter')
		: t('toolbar.insertFrontmatter', 'Insert frontmatter')}
	class={hasFrontmatter.current ? 'sd-active-toolbar-button' : undefined}
	onclick={() => insertFrontmatter()}
>
	<Icon name="frontmatter" />
</ButtonWithTooltip>
