<!-- @component Lets the user toggle bold, italic and underline formatting. -->
<script lang="ts">
	import { IS_BOLD, IS_ITALIC, IS_UNDERLINE } from '../../../FormatConstants.js';
	import { useTranslation } from '../../core/hooks.js';
	import FormatButton from './FormatButton.svelte';

	let { options }: { options?: ('Bold' | 'Italic' | 'Underline')[] } = $props();

	const t = useTranslation();
	const show = (option: 'Bold' | 'Italic' | 'Underline') => !options || options.includes(option);
</script>

<div class="sd-toolbar-group-of-groups">
	{#if show('Bold')}
		<FormatButton
			format={IS_BOLD}
			addTitle={t('toolbar.bold', 'Bold')}
			removeTitle={t('toolbar.removeBold', 'Remove bold')}
			icon="format_bold"
			formatName="bold"
		/>
	{/if}
	{#if show('Italic')}
		<FormatButton
			format={IS_ITALIC}
			addTitle={t('toolbar.italic', 'Italic')}
			removeTitle={t('toolbar.removeItalic', 'Remove italic')}
			icon="format_italic"
			formatName="italic"
		/>
	{/if}
	{#if show('Underline')}
		<FormatButton
			format={IS_UNDERLINE}
			addTitle={t('toolbar.underline', 'Underline')}
			removeTitle={t('toolbar.removeUnderline', 'Remove underline')}
			icon="format_underlined"
			formatName="underline"
		/>
	{/if}
</div>
