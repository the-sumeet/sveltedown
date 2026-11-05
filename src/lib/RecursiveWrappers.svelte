<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import RecursiveWrappers from './RecursiveWrappers.svelte';

	interface Props {
		wrappers: Component<{ children: Snippet }>[];
		children: Snippet;
	}

	let { wrappers, children }: Props = $props();
	const Wrapper = $derived(wrappers[0]);
</script>

{#if wrappers.length === 0}
	{@render children()}
{:else}
	<Wrapper>
		<RecursiveWrappers wrappers={wrappers.slice(1)} {children} />
	</Wrapper>
{/if}
