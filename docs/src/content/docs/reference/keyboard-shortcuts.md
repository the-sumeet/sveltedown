---
title: Keyboard shortcuts
description: Formatting and editing shortcuts.
---

`Mod` is Cmd on macOS and Ctrl elsewhere.

## Formatting

| Keys | Action |
|---|---|
| `Mod-b` | Toggle **bold** on the selection, or the word at the cursor |
| `Mod-i` | Toggle _italic_ |
| `Mod-Shift-x` | Toggle ~~strikethrough~~ |
| `Mod-k` | Insert a link: `[selection](url)` with `url` selected. A selected URL becomes `[](url)` with the cursor in the brackets |
| `Mod-Shift-f` | In a table: pad the cells so the pipes line up |

The toggles read the Markdown structure: inside (or right next to) `**bold**`, `Mod-b` removes the bold, and `Mod-i` inside bold text adds italic rather than removing a `*`. Spaces at the edges of a selection stay outside the markers.

## Lists

| Keys | Action |
|---|---|
| `Enter` | Continue the current list, numbered list or task list |
| `Backspace` | At the start of an empty item, remove its marker |
| `Tab` | Nest the item (and its children) under the previous item |
| `Shift-Tab` | Move the item (and its children) out one level |

Outside a list, `Tab` and `Shift-Tab` keep their browser behavior and move focus out of the editor.

## Navigation in code blocks and tables

Long lines in code blocks and raw tables don't wrap. Inside them:

| Keys | Action |
|---|---|
| `Home` / `Cmd-Left` | Start of the code or row (after any list or quote markup) |
| `End` / `Cmd-Right` | End of the line |

## Links

| Action | Result |
|---|---|
| Click | Places the cursor in the link (reveals its source) |
| Mod-click | Opens the link in a new tab |
| Click in a read-only editor | Opens the link |

## Everything else

CodeMirror's [standard keymap](https://codemirror.net/docs/ref/#commands.standardKeymap) and undo history (`Mod-z`, `Mod-Shift-z` / `Mod-y`) apply.
