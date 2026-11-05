export const kitchenSinkSample = `# Welcome to sveltedown

A **rich text** Markdown editor for _Svelte 5_. Format with the toolbar or with Markdown shortcuts: \`inline code\`, ~~strikethrough~~, ==highlights== and [links](https://svelte.dev).

> The overriding design goal for Markdown's formatting syntax is to make it as readable as possible.

## Lists

- Bullet items, which can nest
  - like this one
- [x] Finished task
- [ ] Open task

1. Numbered items
2. In order

## A table

| Item | In stock | Price |
| :--- | :------: | ----: |
| Svelte hat | True | 23.99 |
| Lexical tee | False | 19.99 |

## Code

\`\`\`ts
export function greet(name: string) {
	return \`Hello, \${name}!\`;
}
\`\`\`

:::tip
Try the source and diff views in the top right of the toolbar.
:::

![The sveltedown logo](%BASE%/logo.svg "sveltedown")
`;
