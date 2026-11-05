<script lang="ts">
	import {
		AdmonitionDirectiveDescriptor,
		GenericDirectiveEditor,
		GenericJsxEditor,
		KitchenSinkToolbar,
		MarkdownEditor,
		codeBlockPlugin,
		codeMirrorPlugin,
		diffSourcePlugin,
		directivesPlugin,
		frontmatterPlugin,
		headingsPlugin,
		imagePlugin,
		jsxPlugin,
		linkDialogPlugin,
		linkPlugin,
		listsPlugin,
		markdownShortcutPlugin,
		quotePlugin,
		searchPlugin,
		tablePlugin,
		thematicBreakPlugin,
		toolbarPlugin,
		type DirectiveDescriptor,
		type JsxComponentDescriptor
	} from '#lib';
	import { sample } from './sample.js';

	let markdown = $state(sample);
	let readonly = $state(false);
	let theme = $state<'auto' | 'light' | 'dark'>('auto');

	$effect(() => {
		const root = document.documentElement;
		if (theme === 'auto') delete root.dataset.theme;
		else root.dataset.theme = theme;
	});

	const youtube: DirectiveDescriptor = {
		name: 'youtube',
		type: 'leafDirective',
		attributes: ['id'],
		hasChildren: false,
		testNode: (node) => node.name === 'youtube',
		Editor: GenericDirectiveEditor
	};

	const jsxComponents: JsxComponentDescriptor[] = [
		{
			name: 'MyLeaf',
			kind: 'text',
			source: './external',
			props: [
				{ name: 'foo', type: 'string' },
				{ name: 'bar', type: 'string' },
				{ name: 'onClick', type: 'expression' }
			],
			hasChildren: true,
			Editor: GenericJsxEditor
		},
		{
			name: 'BlockNode',
			kind: 'flow',
			source: './external',
			props: [],
			hasChildren: true,
			Editor: GenericJsxEditor
		}
	];

	async function imageUploadHandler(file: File) {
		// The playground has no server, so the image stays in the page as a data URL.
		return new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
			reader.readAsDataURL(file);
		});
	}

	const plugins = [
		toolbarPlugin({ toolbarContents: toolbar }),
		listsPlugin(),
		quotePlugin(),
		headingsPlugin(),
		linkPlugin(),
		linkDialogPlugin({
			linkAutocompleteSuggestions: ['https://svelte.dev', 'https://lexical.dev']
		}),
		imagePlugin({ imageUploadHandler }),
		tablePlugin(),
		thematicBreakPlugin(),
		frontmatterPlugin(),
		codeBlockPlugin({ defaultCodeBlockLanguage: 'ts' }),
		codeMirrorPlugin({
			codeBlockLanguages: {
				ts: 'TypeScript',
				js: 'JavaScript',
				css: 'CSS',
				txt: 'Text',
				'': 'Plain'
			}
		}),
		directivesPlugin({ directiveDescriptors: [youtube, AdmonitionDirectiveDescriptor] }),
		jsxPlugin({ jsxComponentDescriptors: jsxComponents }),
		diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: sample }),
		searchPlugin(),
		markdownShortcutPlugin()
	];
</script>

{#snippet toolbar()}
	<KitchenSinkToolbar />
{/snippet}

<svelte:head>
	<title>sveltedown playground</title>
</svelte:head>

<main>
	<header>
		<h1>sveltedown playground</h1>
		<div class="controls">
			<label><input type="checkbox" bind:checked={readonly} /> Read-only</label>
			<label>
				Theme
				<select bind:value={theme}>
					<option value="auto">System</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
				</select>
			</label>
		</div>
	</header>

	<div class="editor">
		<MarkdownEditor bind:markdown {readonly} {plugins} placeholder="Start writing…" />
	</div>

	<details>
		<summary>Markdown</summary>
		<textarea bind:value={markdown} rows="16" aria-label="Markdown"></textarea>
	</details>
</main>

<style>
	:global(html) {
		color-scheme: light dark;
	}

	:global(html[data-theme='light']) {
		color-scheme: light;
	}

	:global(html[data-theme='dark']) {
		color-scheme: dark;
	}

	:global(body) {
		margin: 0;
		background: light-dark(#f7f8fa, #0b0c0e);
		color: light-dark(#1c2024, #edeef0);
		font-family: system-ui, sans-serif;
	}

	main {
		max-width: 60rem;
		margin: 0 auto;
		padding: 1.5rem 1rem 4rem;
	}

	header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}

	h1 {
		margin: 0;
		font-size: 1.25rem;
	}

	.controls {
		display: flex;
		gap: 1rem;
		align-items: center;
		font-size: 0.875rem;
	}

	.editor {
		margin-top: 1rem;
		border: 1px solid light-dark(#d9dde2, #2b2f36);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	details {
		margin-top: 1rem;
	}

	textarea {
		width: 100%;
		margin-top: 0.5rem;
		box-sizing: border-box;
		font-family: ui-monospace, monospace;
		background: transparent;
		color: inherit;
	}
</style>
