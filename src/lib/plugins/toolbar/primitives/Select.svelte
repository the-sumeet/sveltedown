<!-- @component A dropdown, such as the block type select. -->
<script lang="ts" generics="T extends string">
	import { Select as BitsSelect } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { useCellValue } from '../../../realm/hooks.js';
	import Icon from '../../../ui/Icon.svelte';
	import { readOnly$ } from '../../core/index.js';
	import SelectContent from './SelectContent.svelte';
	import SelectItem from './SelectItem.svelte';
	import TooltipWrap from './TooltipWrap.svelte';

	interface Props {
		value: T;
		onChange: (value: T) => void;
		triggerTitle: string;
		placeholder: string;
		disabled?: boolean;
		items: ({ label: string | Snippet; value: T } | 'separator')[];
	}

	let { value, onChange, triggerTitle, placeholder, disabled = false, items }: Props = $props();

	const readOnly = useCellValue(readOnly$);
	const selected = $derived(
		items.find((item) => item !== 'separator' && item.value === value) as
			{ label: string | Snippet; value: T } | undefined
	);
</script>

<BitsSelect.Root
	type="single"
	bind:value={
		() => value || '',
		(next) => {
			if (next !== (value || '')) onChange(next as T);
		}
	}
	{disabled}
>
	<TooltipWrap title={triggerTitle}>
		<BitsSelect.Trigger
			aria-label={placeholder}
			class="sd-select-trigger"
			data-toolbar-item={true}
			disabled={readOnly.current || disabled}
		>
			<span>
				{#if selected}
					{#if typeof selected.label === 'string'}
						{selected.label}
					{:else}
						{@render selected.label()}
					{/if}
				{:else}
					{placeholder}
				{/if}
			</span>
			<span class="sd-select-dropdown-arrow"><Icon name="arrow_drop_down" /></span>
		</BitsSelect.Trigger>
	</TooltipWrap>
	<SelectContent>
		{#each items as item, index (index)}
			{#if item === 'separator'}
				<div role="separator"></div>
			{:else if typeof item.label === 'string'}
				<SelectItem value={item.value} label={item.label} />
			{:else}
				<SelectItem value={item.value}>{@render item.label()}</SelectItem>
			{/if}
		{/each}
	</SelectContent>
</BitsSelect.Root>
