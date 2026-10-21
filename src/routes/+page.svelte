<script lang="ts">
	import { MarkdownEditor } from '#lib';

	let value = $state(
		[
			'# Hello sveltedown',
			'',
			'Some **bold**, *italic* and ~~struck~~ text with `inline code`.',
			'',
			'## Links',
			'',
			'Read the [Svelte docs](https://svelte.dev "Svelte"). Mod-click opens it.',
			'',
			'### Nested **bold *and italic*** heading',
			'',
			'## Tasks',
			'',
			'- [x] Inline live preview',
			'- [ ] Block widgets',
			'- [ ] Keymaps and theme',
			'',
			'---',
			'',
			'## Image',
			'',
			'![Svelte logo](https://svelte.dev/favicon.png "Svelte")',
			'',
			'## Code',
			'',
			'```ts',
			"const greeting = 'hello';",
			'console.log(greeting);',
			"const longLine = ['this line is long enough to scroll sideways instead of wrapping', 42, true];",
			'```',
			''
		].join('\n')
	);
</script>

<main>
	<h1>sveltedown playground</h1>
	<div class="panes">
		<MarkdownEditor bind:value placeholder="Start writing…" />
		<textarea bind:value aria-label="Raw markdown"></textarea>
	</div>
</main>

<style>
	main {
		max-width: 1100px;
		margin: 0 auto;
		padding: 16px;
		font-family: system-ui, sans-serif;
	}
	.panes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 16px;
	}
	textarea {
		min-height: 300px;
		font-family: ui-monospace, monospace;
	}
</style>
