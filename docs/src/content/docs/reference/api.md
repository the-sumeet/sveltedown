---
title: API
description: Every export of the sveltedown package.
---

## Component

| Export | |
|---|---|
| `MarkdownEditor` | The editor component. See [Props](../props/). |

## Stylesheet

| Import | |
|---|---|
| `@the-sumeet/sveltedown/editor.css` | Default `--md-*` variables. Imported by `MarkdownEditor`; import it yourself when using the extensions directly. |

## Extensions

| Export | |
|---|---|
| `coreExtensions()` | All built-in extensions together. |
| `inlineLivePreview()` | Headings, emphasis, inline code and links. |
| `blockWidgets()` | Images, checkboxes, rules, code blocks and tables. |
| `markdownTheme()` | Editor look and raw-syntax colours (`editorTheme` + `markdownHighlightStyle`). |
| `editorKeymaps()` | Formatting shortcuts, CodeMirror's default keymap and undo history keys. |
| `formattingKeymap` | Just the formatting key bindings. |
| `focusTracking()` | Reveal syntax only while the editor has focus. |
| `widgetSnippets` | Facet holding `{ image, codeHeader, table }` snippets for `blockWidgets()`. |

## Commands

| Export | |
|---|---|
| `toggleBold`, `toggleItalic`, `toggleStrikethrough` | Wrap or unwrap emphasis. |
| `toggleWrap(marker)` | Build a toggle for any marker. |
| `insertLink` | Insert `[text](url)`. |
| `formatTable` | Line up the pipes of the table at the cursor. |
| `toggleTask(state, pos)` | Transaction that flips the task at `pos`, or `null`. |

## Building blocks

| Export | |
|---|---|
| `createEditor(options)` | Create an editor without the component. Returns an `EditorController`. |
| `SvelteWidget` | CodeMirror widget that mounts a Svelte 5 component. |
| `tableData(state, node)` | Parse a `Table` syntax node into `TableData`. |
| `buildInlineDecorations(state, ranges)`, `buildBlockDecorations(state)` | The decoration builders behind the extensions. Pure, so they're usable in tests. |
| `isCursorInRange(state, from, to)` | Whether a selection touches a range (boundaries included). |
| `isRevealed(state, from, to)` | Whether a range's syntax should show: cursor, focus and editability. |
| `setEditorFocused` | State effect recording a focus change, as dispatched by `focusTracking()`. |
| `externalSync` | Annotation on transactions that sync the document from the `value` prop. |

## Types

`MarkdownEditorProps`, `ImageSnippetProps`, `CodeHeaderSnippetProps`, `TableSnippetProps`, `TableData`, `TableCellData`, `TableSegment`, `TableAlign`, `EditorController`, `EditorOptions`, `WidgetSnippets`, `SvelteWidgetOptions`.
