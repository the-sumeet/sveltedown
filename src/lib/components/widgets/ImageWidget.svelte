<script lang="ts">
	import type { ImageSnippetProps } from '../../types.js';

	let { src, alt, title, view }: ImageSnippetProps = $props();

	// Remembering which src failed resets the error state when src changes.
	let failedSrc: string | null = $state(null);
	const failed = $derived(failedSrc === src);
</script>

{#if failed}
	<span class="cm-md-image-error" title={src}>Image failed to load: {alt || src}</span>
{:else}
	<img
		{src}
		{alt}
		{title}
		onload={() => view.requestMeasure()}
		onerror={() => {
			failedSrc = src;
			view.requestMeasure();
		}}
	/>
{/if}
