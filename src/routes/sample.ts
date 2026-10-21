export const sample = `# Welcome to sveltedown

A **live-preview** Markdown editor for *Svelte 5*. Syntax like \`**\` and \`#\` hides away from the cursor and comes back when you move into it.

## Formatting

Select a word and press \`Mod-b\` for **bold**, \`Mod-i\` for *italic* or \`Mod-Shift-x\` for ~~strikethrough~~. Press \`Mod-k\` to turn it into a link, like the [Svelte docs](https://svelte.dev "Svelte"). Mod-click a link to open it.

### Nested **bold *and italic*** in a heading

## Tasks

- [x] Inline live preview
- [x] Block widgets
- [x] Keymaps and theme
- [ ] Ship it

Press Enter at the end of a task to start the next one.

---

## Image

![Svelte logo](/favicon.svg "Click the image to edit its source")

## Code

\`\`\`ts
const editor = 'sveltedown';
console.log(\`Hello from \${editor}\`);
const longLine = ['long lines scroll sideways instead of wrapping', 42, true, null, { ok: true }];
\`\`\`
`;
