<!-- @component Lets the user toggle strikethrough, superscript and subscript formatting. -->
<script lang="ts">
	import { IS_STRIKETHROUGH, IS_SUBSCRIPT, IS_SUPERSCRIPT } from '../../../FormatConstants.js';
	import { useTranslation } from '../../core/hooks.js';
	import FormatButton from './FormatButton.svelte';

	let { options }: { options?: ('Strikethrough' | 'Sub' | 'Sup')[] } = $props();

	const t = useTranslation();
	const show = (option: 'Strikethrough' | 'Sub' | 'Sup') => !options || options.includes(option);
</script>

<div class="sd-toolbar-group-of-groups">
	{#if show('Strikethrough')}
		<FormatButton
			format={IS_STRIKETHROUGH}
			addTitle={t('toolbar.strikethrough', 'Strikethrough')}
			removeTitle={t('toolbar.removeStrikethrough', 'Remove strikethrough')}
			icon="strikeThrough"
			formatName="strikethrough"
		/>
	{/if}
	{#if show('Sup')}
		<FormatButton
			format={IS_SUPERSCRIPT}
			addTitle={t('toolbar.superscript', 'Superscript')}
			removeTitle={t('toolbar.removeSuperscript', 'Remove superscript')}
			icon="superscript"
			formatName="superscript"
		/>
	{/if}
	{#if show('Sub')}
		<FormatButton
			format={IS_SUBSCRIPT}
			addTitle={t('toolbar.subscript', 'Subscript')}
			removeTitle={t('toolbar.removeSubscript', 'Remove subscript')}
			icon="subscript"
			formatName="subscript"
		/>
	{/if}
</div>
