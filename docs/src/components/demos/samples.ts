// Demo documents live here rather than inline in MDX, which strips leading
// indentation from JSX attribute lines and would flatten nested lists.

export const homeSample = `# Try it

Click into this text. Syntax like **bold**, *italic*, ~~strikethrough~~ and \`inline code\` shows as you move into it, and hides again when you move away. Mod-click a [link](https://svelte.dev "Svelte") to open it.

## Lists

- Bullets render as dots
  - Press Tab to nest an item, Shift-Tab to move it back out
    - Each level alternates the bullet style
- Press Enter at the end of an item to continue the list

1. Numbered lists
2. Keep their numbers

- [x] Task lists with real checkboxes
- [ ] Press Enter here to add another

## Tables and code

| Feature | Shortcut |
|:--|--:|
| **Bold** | \`Mod-b\` |
| *Italic* | \`Mod-i\` |
| [Link](https://svelte.dev) | \`Mod-k\` |
| Line up the pipes | \`Mod-Shift-f\` |

\`\`\`ts
const editor = 'sveltedown'; // long lines scroll sideways instead of wrapping
console.log(\`Hello from \${editor}\`);
\`\`\`

---

## Images

![Svelte logo](%BASE%/logo.svg "Click the image to edit its source")

### Headings go down to level six
`;

export const livePreviewSample = `# Heading

Some **bold**, *italic*, ~~struck~~ and \`inline code\`, plus a [link](https://svelte.dev "Svelte").

- A bullet
  - Nested a level down
- [x] A finished task
- [ ] Click a checkbox to toggle it

---

![Svelte logo](%BASE%/logo.svg "Click the image to edit its source")
`;
