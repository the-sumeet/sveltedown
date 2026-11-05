# sveltedown

A rich text Markdown editor for **Svelte 5**: a port of [MDXEditor](https://mdxeditor.dev) to
Svelte, built on [Lexical](https://lexical.dev).

You write in a document editor, and the document is stored as Markdown.

- Headings, quotes, lists and check lists, links, and inline formatting
- Images with upload, paste, drag and drop, and resizing
- Tables with formatted cells
- Code blocks with CodeMirror, plus a Markdown source view and a diff view
- Markdown shortcuts while typing
- Directives and admonitions, front-matter, and MDX JSX components
- Search and replace
- A composable toolbar, theming with CSS variables, light and dark modes, and translation
- `bind:markdown`, snippets and components, and server rendering in SvelteKit

Its plugins, options and reactive state keep MDXEditor's names, so MDXEditor's documentation mostly
applies too.

## Install

```sh
npm install @the-sumeet/sveltedown
```

`svelte@^5.40` is a peer dependency.

## Usage

```svelte
<script lang="ts">
	import {
		BoldItalicUnderlineToggles,
		MarkdownEditor,
		UndoRedo,
		headingsPlugin,
		listsPlugin,
		markdownShortcutPlugin,
		quotePlugin,
		toolbarPlugin
	} from '@the-sumeet/sveltedown';

	let markdown = $state('# Hello\n\nStart **writing**…');

	const plugins = [
		headingsPlugin(),
		listsPlugin(),
		quotePlugin(),
		markdownShortcutPlugin(),
		toolbarPlugin({ toolbarContents: toolbar })
	];
</script>

{#snippet toolbar()}
	<UndoRedo />
	<BoldItalicUnderlineToggles />
{/snippet}

<MarkdownEditor bind:markdown {plugins} placeholder="Start writing…" />
```

## Documentation

The documentation, with live demos of every feature, is the Starlight site in [`docs/`](docs/),
published to GitHub Pages. Upgrading from 1.x, which was a different, CodeMirror-based editor? See
the [migration guide](docs/src/content/docs/guides/migrating.mdx).

## Development

```sh
npm install
npm run dev          # the playground in src/routes, with every plugin enabled
npm run check        # svelte-check
npm run lint
npm run test:unit    # Vitest: node and browser (Chromium) projects
npm run test:e2e     # Playwright against the production build
npm run package      # svelte-package + publint

npm run docs:dev     # docs site (run `npm install` in docs/ first)
npm run docs:build
npm run docs:check
```

Tests in `src/tests/upstream` are ported from MDXEditor's test suite.

## License

MIT. sveltedown is a port of MDXEditor and of its state library Gurx, both MIT-licensed by
Petyo Ivanov.
