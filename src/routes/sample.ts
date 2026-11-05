export const sample = `---
title: Welcome to sveltedown
tags: svelte
---

# Welcome to sveltedown

A **rich text** Markdown editor for _Svelte 5_, with \`inline code\`, ~~strikethrough~~, ==highlights==, <u>underline</u>, and [links](https://svelte.dev).

## Lists

- Bullet items, which can nest
  - like this one
- Another item

1. Numbered items
2. In order

- [x] Finished task
- [ ] Open task

## Tables

| Feature | Status | Notes |
| :------ | :----: | ----: |
| Tables | Ready | Click a cell to edit |
| Alignment | Ready | Use the column menu |

## Code

\`\`\`ts
export function greet(name: string) {
	return \`Hello, \${name}!\`;
}
\`\`\`

## Quotes and breaks

> Markdown stays Markdown: this quote is a real block quote.

---

## Admonitions

:::tip
Admonitions are nested editors, so **formatting** works in here too.
:::

:::caution
Try the source and diff views in the toolbar.
:::

## Images

![The Svelte logo](/favicon.svg "Favicon")

## Components

<BlockNode>
  JSX components keep their content editable.
</BlockNode>

Inline components like <MyLeaf foo="bar">this one</MyLeaf> work as well.
`;
