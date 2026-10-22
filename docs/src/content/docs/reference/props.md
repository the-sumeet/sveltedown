---
title: Props
description: Everything MarkdownEditor accepts.
---

```svelte
<MarkdownEditor bind:value placeholder="…" readonly={false} class="…" onchange={…} extensions={[…]} />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | `''` | The Markdown source. Supports `bind:value`. Setting it from outside replaces only the changed part of the document. |
| `placeholder` | `string` | `''` | Shown when the document is empty. |
| `readonly` | `boolean` | `false` | Disables editing. Everything stays rendered; links open with a plain click. |
| `class` | `string` | `''` | Extra class on the editor element; useful for per-instance [theming](../../guides/theming/). |
| `onchange` | `(value: string) => void` | | Called after each edit made in the editor. Not called when `value` is set from outside. |
| `onlinkclick` | `(url: string, event: MouseEvent) => boolean \| void` | | Called with the destination of a link the user follows, in text or in a table. Return `true` once handled; otherwise it opens as usual. See [Links](../../guides/live-preview/#links). |
| `imageSnippet` | `Snippet<[ImageSnippetProps]>` | | Replaces the image preview. See [Custom snippets](../../guides/custom-snippets/#images). |
| `codeHeaderSnippet` | `Snippet<[CodeHeaderSnippetProps]>` | | Replaces the code block header. See [Custom snippets](../../guides/custom-snippets/#code-block-header). |
| `tableSnippet` | `Snippet<[TableSnippetProps]>` | | Replaces the rendered table. See [Custom snippets](../../guides/custom-snippets/#tables). |
| `extensions` | `Extension[]` | `[]` | Extra CodeMirror extensions, added after the built-ins. See [CodeMirror building blocks](../../guides/codemirror/). |

Every prop can change after mount: `readonly`, `placeholder`, `extensions` and the snippets are applied to the running editor without recreating it.

## Snippet prop types

```ts
interface ImageSnippetProps {
	src: string;
	alt: string;
	title?: string;
	view: EditorView;
}

interface CodeHeaderSnippetProps {
	language: string; // first word of the info string
	info: string; // the whole info string
	code: string;
	view: EditorView;
}

interface TableSnippetProps {
	table: TableData; // see Custom snippets → Tables
	view: EditorView;
}
```
