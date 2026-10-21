<script lang="ts">
	import { MarkdownEditor } from '#lib';
	import type { ImageSnippetProps } from '#lib';
	import { sample } from './sample.js';

	type Theme = 'auto' | 'light' | 'dark';

	let value = $state(sample);
	let readonly = $state(false);
	let customImages = $state(false);
	let theme: Theme = $state('auto');
	let changes = $state(0);

	const words = $derived(value.trim() ? value.trim().split(/\s+/).length : 0);

	$effect(() => {
		const root = document.documentElement;
		if (theme === 'auto') delete root.dataset.theme;
		else root.dataset.theme = theme;
	});

	function appendLine() {
		value = `${value.trimEnd()}\n\nAdded from outside at ${new Date().toLocaleTimeString()}.\n`;
	}
</script>

<svelte:head>
	<title>sveltedown playground</title>
</svelte:head>

{#snippet captionedImage({ src, alt, title, view }: ImageSnippetProps)}
	<figure class="captioned">
		<img {src} {alt} onload={() => view.requestMeasure()} />
		<figcaption>{title || alt}</figcaption>
	</figure>
{/snippet}

<main>
	<header>
		<h1>sveltedown</h1>
		<p>Live-preview Markdown editing for Svelte 5, built on CodeMirror 6.</p>
	</header>

	<div class="toolbar" role="toolbar" aria-label="Playground options">
		<label>
			Theme
			<select bind:value={theme}>
				<option value="auto">System</option>
				<option value="light">Light</option>
				<option value="dark">Dark</option>
			</select>
		</label>
		<label><input type="checkbox" bind:checked={readonly} /> Read-only</label>
		<label><input type="checkbox" bind:checked={customImages} /> Custom image snippet</label>
		<span class="spacer"></span>
		<button type="button" onclick={() => (value = sample)}>Reset</button>
		<button type="button" onclick={appendLine}>Append line</button>
		<button type="button" onclick={() => (value = '')}>Clear</button>
	</div>

	<div class="panes">
		<section aria-label="Editor">
			<h2>Editor</h2>
			<div class="card">
				<MarkdownEditor
					bind:value
					{readonly}
					placeholder="Start writing…"
					imageSnippet={customImages ? captionedImage : undefined}
					onchange={() => changes++}
				/>
			</div>
		</section>
		<section aria-label="Markdown source">
			<h2>Markdown <small>bound to the same <code>$state</code></small></h2>
			<textarea bind:value aria-label="Markdown source" spellcheck="false"></textarea>
		</section>
	</div>

	<p class="stats" aria-live="polite">
		{value.length} characters · {words} words · {changes} edits in the editor
	</p>
</main>

<style>
	:global(:root) {
		color-scheme: light dark;
		--page-bg: light-dark(#f6f8fa, #010409);
		--page-text: light-dark(#1f2328, #e6edf3);
		--page-muted: light-dark(#59636e, #9198a1);
		--page-border: light-dark(#d0d7de, #30363d);
		--page-card: light-dark(#ffffff, #0d1117);
	}
	:global(:root[data-theme='light']) {
		color-scheme: light;
	}
	:global(:root[data-theme='dark']) {
		color-scheme: dark;
	}
	:global(body) {
		margin: 0;
		background: var(--page-bg);
		color: var(--page-text);
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			Roboto,
			sans-serif;
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 24px 16px 48px;
	}
	header h1 {
		margin: 0;
		font-size: 1.75rem;
	}
	header p {
		margin: 4px 0 16px;
		color: var(--page-muted);
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 16px;
		padding: 10px 12px;
		margin-bottom: 16px;
		border: 1px solid var(--page-border);
		border-radius: 8px;
		background: var(--page-card);
		font-size: 0.9rem;
	}
	.toolbar label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.spacer {
		flex: 1;
	}
	button,
	select {
		font: inherit;
		color: inherit;
		background: transparent;
		border: 1px solid var(--page-border);
		border-radius: 6px;
		padding: 4px 10px;
		cursor: pointer;
	}

	.panes {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		gap: 16px;
	}
	@media (max-width: 800px) {
		.panes {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	h2 {
		margin: 0 0 8px;
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--page-muted);
	}
	h2 small {
		text-transform: none;
		letter-spacing: 0;
		font-weight: 400;
	}
	.card {
		border: 1px solid var(--page-border);
		border-radius: 8px;
		overflow: hidden;
		background: var(--page-card);
	}
	/* Make the whole card clickable, not just the lines of text. */
	.card :global(.cm-scroller) {
		min-height: 480px;
	}
	textarea {
		box-sizing: border-box;
		width: 100%;
		min-height: 480px;
		height: calc(100% - 28px);
		padding: 12px 16px;
		border: 1px solid var(--page-border);
		border-radius: 8px;
		background: var(--page-card);
		color: inherit;
		font:
			0.85rem/1.5 ui-monospace,
			SFMono-Regular,
			Menlo,
			Consolas,
			monospace;
		resize: vertical;
	}
	.stats {
		color: var(--page-muted);
		font-size: 0.85rem;
	}

	.captioned {
		display: inline-block;
		margin: 0;
		padding: 8px;
		border: 1px solid var(--page-border);
		border-radius: 8px;
		text-align: center;
	}
	.captioned img {
		display: block;
		max-width: 100%;
		max-height: 160px;
		margin: 0 auto;
	}
	.captioned figcaption {
		margin-top: 6px;
		font-size: 0.85em;
		color: var(--page-muted);
	}
</style>
