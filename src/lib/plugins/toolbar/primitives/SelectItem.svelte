<script lang="ts">
	import { Select as BitsSelect } from 'bits-ui';
	import type { Snippet } from 'svelte';

	interface Props {
		value: string;
		label?: string;
		class?: string;
		children?: Snippet;
	}

	let { value, label, class: className, children }: Props = $props();
</script>

<BitsSelect.Item {value} {label} class={['sd-select-item', className].filter(Boolean).join(' ')}>
	{#if children}
		{@render children()}
	{:else}
		{label}
	{/if}
</BitsSelect.Item>
