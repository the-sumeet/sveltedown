<script lang="ts">
	import { MarkdownEditor } from '@the-sumeet/sveltedown';
	import type { CodeHeaderSnippetProps, ImageSnippetProps, TableSnippetProps } from '@the-sumeet/sveltedown';

	let { kind }: { kind: 'image' | 'code' | 'table' } = $props();

	const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

	const documents = {
		image: `Images render through your snippet:\n\n![Svelte logo](${base}logo.svg "Rendered by imageSnippet")\n\nClick the image to edit its source.`,
		code: 'The header above the code is your snippet:\n\n```ts title="greet.ts"\nexport const greet = (name: string) => `Hello, ${name}!`;\n```\n\nThe code area itself stays the built-in one.',
		table:
			'This table renders as cards:\n\n| Package | Role |\n|---|---|\n| svelte | Components and runes |\n| @codemirror/view | Editing surface |\n| @lezer/markdown | Parsing |\n\nClick a card to edit the source.'
	};

	// svelte-ignore state_referenced_locally
	let value = $state(documents[kind]);

	/** `title="…"` from a fence's info string, if present. */
	const titleOf = (info: string) => /title="([^"]*)"/.exec(info)?.[1];
</script>

{#snippet image({ src, alt, title, view }: ImageSnippetProps)}
	<figure class="snippet-figure">
		<img {src} {alt} onload={() => view.requestMeasure()} />
		<figcaption>{title ?? alt}</figcaption>
	</figure>
{/snippet}

{#snippet codeHeader({ language, info }: CodeHeaderSnippetProps)}
	<span class="snippet-code-header">
		<strong>{titleOf(info) ?? 'untitled'}</strong>
		<span>{language}</span>
	</span>
{/snippet}

{#snippet table({ table }: TableSnippetProps)}
	<div class="snippet-cards">
		{#each table.rows as row, r (r)}
			<div class="snippet-card">
				{#each row as cell, i (i)}
					<div><small>{table.header[i]?.text}</small> {cell.text}</div>
				{/each}
			</div>
		{/each}
	</div>
{/snippet}

<div class="demo not-content">
	<div class="demo-editor" style:--demo-height="14rem">
		<MarkdownEditor
			bind:value
			imageSnippet={kind === 'image' ? image : undefined}
			codeHeaderSnippet={kind === 'code' ? codeHeader : undefined}
			tableSnippet={kind === 'table' ? table : undefined}
		/>
	</div>
</div>

<style>
	.snippet-figure {
		display: inline-block;
		margin: 0;
		padding: 0.5rem;
		border: 1px solid var(--sl-color-gray-5);
		border-radius: 0.5rem;
		text-align: center;
	}
	.snippet-figure img {
		display: block;
		height: 96px;
		margin: 0 auto;
	}
	.snippet-figure figcaption {
		margin-top: 0.25rem;
		font-size: 0.85em;
		color: var(--sl-color-gray-3);
	}
	.snippet-code-header {
		display: flex;
		width: 100%;
		justify-content: space-between;
	}
	.snippet-cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: 0.5rem;
		cursor: text;
	}
	.snippet-card {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--sl-color-gray-5);
		border-left: 3px solid var(--sl-color-accent);
		border-radius: 0.375rem;
	}
	.snippet-card small {
		display: block;
		color: var(--sl-color-gray-3);
	}
</style>
