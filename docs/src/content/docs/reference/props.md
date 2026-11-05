---
title: Props and methods
description: The props of MarkdownEditor, and the methods available through bind:this.
---

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `markdown` | `string` | `''` | The Markdown to edit. Supports `bind:markdown`. |
| `plugins` | `RealmPlugin[]` | `[]` | The plugins. |
| `onchange` | `(markdown, initialMarkdownNormalize) => void` | | Called when the Markdown changes. |
| `onerror` | `({ error, source }) => void` | | Called when Markdown can't be loaded. See [error handling](../../guides/error-handling/). |
| `onblur` | `(event: FocusEvent) => void` | | Called when focus leaves the editor. |
| `placeholder` | `string \| Snippet` | `''` | Shown when the editor is empty. |
| `readonly` | `boolean` | `false` | Makes the editor read-only. |
| `class` | `string` | `''` | Class of the root element and the popup container. |
| `contentEditableClass` | `string` | `''` | Class of the editable area. |
| `spellCheck` | `boolean` | `true` | The editable area's `spellcheck`. |
| `autoFocus` | `boolean \| { defaultSelection?, preventScroll? }` | `false` | Focus the editor when it's mounted. |
| `toMarkdownOptions` | `ToMarkdownOptions` | `{ listItemIndent: 'one' }` | [`mdast-util-to-markdown` options](https://github.com/syntax-tree/mdast-util-to-markdown#options), such as `bullet`. |
| `suppressHtmlProcessing` | `boolean` | `false` | Don't read HTML in the Markdown. |
| `trim` | `boolean` | `true` | Trim the initial Markdown. |
| `translation` | `Translation` | | Translates the UI. See [translation](../../guides/i18n/). |
| `iconComponentFor` | `(name: IconKey) => Component \| string` | | Replaces icons. |
| `lexicalTheme` | `EditorThemeClasses` | | A custom Lexical theme. |
| `overlayContainer` | `HTMLElement \| null` | `document.body` | Where popups render. |
| `suppressSharedHistory` | `boolean` | `false` | Disables the shared undo history, for collaboration plugins. |
| `editorState` | `EditorState \| null` | | The initial Lexical state. `null` skips loading the Markdown. |
| `additionalLexicalNodes` | `AdditionalLexicalNode[]` | `[]` | Extra Lexical nodes. |
| `lexicalEditorNamespace` | `string` | `'Sveltedown'` | The Lexical namespace. |

## Methods

Get them with `bind:this`:

| Method | |
| --- | --- |
| `getMarkdown()` | The current Markdown. In source and diff mode, the source text. |
| `setMarkdown(markdown)` | Replaces the Markdown. |
| `insertMarkdown(markdown)` | Inserts Markdown at the cursor. In source and diff mode, inserts the text. |
| `focus(callback?, options?)` | Focuses the editor. |
| `getContentEditableHTML()` | The HTML of the editable area. |
| `getSelectionMarkdown()` | The Markdown of the selection, or `''`. |

Calls made before the editor exists, such as from a parent's `$effect.pre`, run once it does.
