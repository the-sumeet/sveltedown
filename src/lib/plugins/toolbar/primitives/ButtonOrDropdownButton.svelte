<!-- @component A toolbar button, or a dropdown if there is more than one item. -->
<script lang="ts" generics="T extends string">
	import { Select as BitsSelect } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { useCellValue } from '../../../realm/hooks.js';
	import Icon from '../../../ui/Icon.svelte';
	import { readOnly$ } from '../../core/index.js';
	import ButtonWithTooltip from './ButtonWithTooltip.svelte';
	import SelectContent from './SelectContent.svelte';
	import SelectItem from './SelectItem.svelte';
	import TooltipWrap from './TooltipWrap.svelte';

	interface Props {
		/** The contents of the button - usually an icon. */
		children: Snippet;
		/** The title used for the tooltip. */
		title: string;
		/** Called when the button is clicked (with an empty string) or an item is chosen. */
		onChoose: (value: T) => void;
		/** The items to show in the dropdown. */
		items: { value: T; label: string | Snippet }[];
	}

	let { children, title, onChoose, items }: Props = $props();

	const readOnly = useCellValue(readOnly$);
</script>

{#if items.length === 1}
	<ButtonWithTooltip {title} onclick={() => onChoose('' as T)} disabled={readOnly.current}>
		{@render children()}
	</ButtonWithTooltip>
{:else}
	<BitsSelect.Root type="single" bind:value={() => '', (next) => onChoose(next as T)}>
		<TooltipWrap {title}>
			<BitsSelect.Trigger
				aria-label={title}
				class="sd-toolbar-button-select-trigger"
				disabled={readOnly.current}
			>
				{@render children()}
				<span class="sd-select-dropdown-arrow"><Icon name="arrow_drop_down" /></span>
			</BitsSelect.Trigger>
		</TooltipWrap>
		<SelectContent class="sd-toolbar-button-dropdown-container">
			{#each items as item, index (index)}
				{#if typeof item.label === 'string'}
					<SelectItem value={item.value} label={item.label} />
				{:else}
					<SelectItem value={item.value}>{@render item.label()}</SelectItem>
				{/if}
			{/each}
		</SelectContent>
	</BitsSelect.Root>
{/if}
