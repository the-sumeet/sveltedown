# sveltedown

A live-preview Markdown editor for **Svelte 5**, built on **CodeMirror 6**, in the style of Typora and Obsidian.

The document stays plain Markdown text. Syntax such as `**`, `#` and `[text](url)` is hidden while the cursor is elsewhere and shows again when the cursor moves into it. Nothing is revealed while the editor is unfocused or read-only, so the document reads as fully rendered. Images, task checkboxes, horizontal rules and code blocks render as interactive Svelte components.

- Two-way `bind:value`, safe to render with SSR in SvelteKit
- Headings, bold, italic, strikethrough, inline code and links styled in place
- Image previews, clickable task checkboxes, horizontal rules
- Code blocks with a language label, a copy button, and lines that scroll sideways instead of wrapping
- Formatting shortcuts, plus list and task continuation on Enter
- Themed with CSS variables, with light and dark modes
- Custom Svelte snippets for images and code block headers

## Install

```sh
npm install sveltedown
```

`svelte@^5` is a peer dependency.

## Usage

```svelte
<script lang="ts">
	import { MarkdownEditor } from 'sveltedown';

	let value = $state('# Hello\n\nStart **writing**…');
</script>

<MarkdownEditor bind:value placeholder="Start writing…" />
```

The component imports its own stylesheet. If you use the CodeMirror extensions without the component, import `sveltedown/editor.css` yourself.

### Props

| Prop                | Type                                | Default | Description                                             |
| ------------------- | ----------------------------------- | ------- | ------------------------------------------------------- |
| `value`             | `string`                            | `''`    | Markdown source. Supports `bind:value`.                 |
| `placeholder`       | `string`                            | `''`    | Shown when the document is empty.                       |
| `readonly`          | `boolean`                           | `false` | Disables editing. Links open with a plain click.        |
| `class`             | `string`                            | `''`    | Extra class for the editor element.                     |
| `onchange`          | `(value: string) => void`           |         | Called after each edit made in the editor.              |
| `imageSnippet`      | `Snippet<[ImageSnippetProps]>`      |         | Replaces the image preview.                             |
| `codeHeaderSnippet` | `Snippet<[CodeHeaderSnippetProps]>` |         | Replaces the code block header (language and copy).     |
| `extensions`        | `Extension[]`                       | `[]`    | Extra CodeMirror extensions, added after the built-ins. |

Changing `value` from outside updates the editor in place. Only the changed part of the document is replaced, so the cursor and undo history elsewhere are kept. `onchange` is not called for those updates.

### Custom snippets

```svelte
<MarkdownEditor bind:value>
	{#snippet imageSnippet({ src, alt, title, view })}
		<figure>
			<img {src} {alt} onload={() => view.requestMeasure()} />
			<figcaption>{title ?? alt}</figcaption>
		</figure>
	{/snippet}
</MarkdownEditor>
```

`codeHeaderSnippet` receives `language` (the first word of the fence's info string), `info` (the whole string, e.g. `ts title="a.ts"`) and `code`. Each snippet also receives `view`, the CodeMirror `EditorView`. If your content changes size after it renders, for example when an image loads, call `view.requestMeasure()` so cursor positions stay accurate.

## Keyboard shortcuts

`Mod` is Cmd on macOS and Ctrl elsewhere.

| Keys          | Action                                                      |
| ------------- | ----------------------------------------------------------- |
| `Mod-b`       | Toggle **bold** on the selection or the word at the cursor. |
| `Mod-i`       | Toggle _italic_.                                            |
| `Mod-Shift-x` | Toggle ~~strikethrough~~.                                   |
| `Mod-k`       | Insert a link: `[selection](url)` with `url` selected.      |
| `Enter`       | Continue the current list or task list.                     |
| Mod-click     | Open a link (`http`, `https` and `mailto` only).            |

## Theming

Everything the editor draws reads `--md-*` CSS variables. The defaults have zero specificity, so any rule that targets the editor overrides them:

```css
.sveltedown {
	--md-font-family: 'Inter', sans-serif;
	--md-link-color: #d6336c;
	--md-padding: 2rem;
}
```

| Variable                                                   | Controls                    |
| ---------------------------------------------------------- | --------------------------- |
| `--md-font-family`, `--md-font-mono`                       | Prose and code fonts        |
| `--md-font-size`, `--md-line-height`, `--md-padding`       | Size and spacing            |
| `--md-text`, `--md-bg`, `--md-muted`, `--md-heading-color` | Text and background colours |
| `--md-link-color`, `--md-accent`                           | Links, checkboxes           |
| `--md-code-bg`, `--md-code-block-bg`                       | Inline code and code blocks |
| `--md-border`, `--md-selection`, `--md-caret`              | Rules, selection and caret  |

The colours follow the system light/dark setting. To force one, set `data-theme="light"` or `data-theme="dark"` on the editor or any ancestor, such as `<html>`; the nearest one wins. This sets `color-scheme` on that element, which also themes native controls inside it. The defaults use `light-dark()`, which needs Chrome 123+, Firefox 120+ or Safari 17.5+.

## CodeMirror building blocks

The extensions behind the component are exported too, for use in your own CodeMirror setup or alongside the `extensions` prop:

- `inlineLivePreview()`, `blockWidgets()`, `markdownTheme()`, `editorKeymaps()`, `focusTracking()` and `coreExtensions()` (all of them together). Without `focusTracking()`, syntax is revealed by cursor position alone.
- the commands `toggleBold`, `toggleItalic`, `toggleStrikethrough`, `toggleWrap(marker)`, `insertLink` and `toggleTask`
- `SvelteWidget`, a CodeMirror `WidgetType` that mounts any Svelte 5 component and updates its props in place
- `createEditor()`, the framework-agnostic setup the component uses

## Development

```sh
npm install
npm run dev        # playground at src/routes
npm run check      # svelte-check
npm run lint
npm run test:unit  # Vitest: node and browser (Chromium) projects
npm run test:e2e   # Playwright against the production build
npm run package    # svelte-package + publint
```
