# sveltedown

A live-preview Markdown editor for **Svelte 5**, built on **CodeMirror 6**, in the style of Typora and Obsidian.

The document stays plain Markdown text. Syntax such as `**`, `#` and `[text](url)` is hidden while the cursor is elsewhere and shows again when the cursor moves into it. Images, task checkboxes, code blocks and tables render as interactive Svelte components.

- Two-way `bind:value`, safe to render with SSR in SvelteKit
- Headings, emphasis, inline code and links styled in place
- Image previews, clickable task checkboxes, horizontal rules
- Code blocks that scroll instead of wrapping, with a copy button
- GFM tables rendered as HTML tables, with a command that lines up their source
- Formatting shortcuts, plus list and task continuation on Enter
- Themed with CSS variables, with light and dark modes
- Custom Svelte snippets for images, code block headers and tables

## Install

```sh
npm install @the-sumeet/sveltedown
```

`svelte@^5` is a peer dependency.

## Usage

```svelte
<script lang="ts">
	import { MarkdownEditor } from '@the-sumeet/sveltedown';

	let value = $state('# Hello\n\nStart **writing**…');
</script>

<MarkdownEditor bind:value placeholder="Start writing…" />
```

## Documentation

The full documentation, with live demos, is the Starlight site in [`docs/`](docs/), published to GitHub Pages. It covers:

- [Installation](docs/src/content/docs/getting-started/installation.mdx) and [quick start](docs/src/content/docs/getting-started/quick-start.mdx)
- [Live preview](docs/src/content/docs/guides/live-preview.mdx), [code blocks](docs/src/content/docs/guides/code-blocks.mdx) and [tables](docs/src/content/docs/guides/tables.mdx)
- [Theming](docs/src/content/docs/guides/theming.mdx) and [custom snippets](docs/src/content/docs/guides/custom-snippets.mdx)
- [CodeMirror building blocks](docs/src/content/docs/guides/codemirror.mdx)
- Reference: [props](docs/src/content/docs/reference/props.md), [keyboard shortcuts](docs/src/content/docs/reference/keyboard-shortcuts.md) and [API](docs/src/content/docs/reference/api.md)

## Development

```sh
npm install
npm run dev          # playground at src/routes
npm run check        # svelte-check
npm run lint
npm run test:unit    # Vitest: node and browser (Chromium) projects
npm run test:e2e     # Playwright against the production build
npm run package      # svelte-package + publint

npm run docs:dev     # docs site (run `npm install` in docs/ first)
npm run docs:build
npm run docs:check
```

## License

[MIT](LICENSE)
