<script lang="ts">
	import { MarkdownEditor } from '#lib';

	let markdown = $state('A **rich text** _Markdown_ editor, with `inline code`.\n');
</script>

<svelte:head>
	<title>sveltedown playground</title>
</svelte:head>

<main>
	<h1>sveltedown playground</h1>
	<MarkdownEditor bind:markdown placeholder="Start writing…" />
	<h2>Markdown</h2>
	<textarea bind:value={markdown} rows="8" aria-label="Markdown"></textarea>
</main>

<style>
	main {
		max-width: 48rem;
		margin: 2rem auto;
		padding: 0 1rem;
		font-family: system-ui, sans-serif;
	}

	textarea {
		width: 100%;
		box-sizing: border-box;
		font-family: ui-monospace, monospace;
	}
</style>
