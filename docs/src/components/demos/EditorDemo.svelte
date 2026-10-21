<script lang="ts">
	import { MarkdownEditor } from 'sveltedown';

	let {
		value: initial = '',
		height = '20rem',
		showSource = false,
		readonly = false
	}: { value?: string; height?: string; showSource?: boolean; readonly?: boolean } = $props();

	// `%BASE%/` in a demo document becomes the site's base path, so images in
	// `public/` resolve when the docs are served from a sub-path (GitHub Pages).
	const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
	const seed = () => initial.replaceAll('%BASE%/', base);

	// The demo owns its document after the first render; the prop only seeds it.
	let value = $state(seed());
	// svelte-ignore state_referenced_locally
	let sourceOpen = $state(showSource);
</script>

<div class="demo not-content">
	<div class="demo-editor" style:--demo-height={height}>
		<MarkdownEditor bind:value {readonly} placeholder="Start writing…" />
	</div>
	<div class="demo-bar">
		<button type="button" onclick={() => (sourceOpen = !sourceOpen)} aria-expanded={sourceOpen}>
			{sourceOpen ? 'Hide' : 'Show'} Markdown
		</button>
		<button type="button" onclick={() => (value = seed())}>Reset</button>
	</div>
	{#if sourceOpen}
		<textarea bind:value aria-label="Markdown source" spellcheck="false"></textarea>
	{/if}
</div>
