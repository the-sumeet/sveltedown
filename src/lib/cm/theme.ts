import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

/**
 * Writing-app chrome: no gutters or focus ring, prose typography. Every value comes
 * from a `--md-*` CSS variable (defaults in `styles/editor.css`).
 */
export const editorTheme = EditorView.theme({
	'&': {
		color: 'var(--md-text)',
		backgroundColor: 'var(--md-bg)',
		fontSize: 'var(--md-font-size)'
	},
	'&.cm-focused': { outline: 'none' },
	'.cm-scroller': {
		fontFamily: 'var(--md-font-family)',
		lineHeight: 'var(--md-line-height)'
	},
	'.cm-content': { padding: 'var(--md-padding)', caretColor: 'var(--md-caret)' },
	'.cm-line': { padding: '0' },
	'.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--md-caret)' },
	'.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-content ::selection':
		{ backgroundColor: 'var(--md-selection)' },
	'.cm-placeholder': { color: 'var(--md-muted)' }
});

/**
 * Colours for raw Markdown. Headings, emphasis, links and code are styled by the
 * live-preview decorations; this covers what shows while the source is revealed.
 */
export const markdownHighlightStyle = HighlightStyle.define([
	{ tag: tags.processingInstruction, color: 'var(--md-muted)' },
	{ tag: [tags.url, tags.labelName, tags.string], color: 'var(--md-muted)' },
	{ tag: tags.contentSeparator, color: 'var(--md-muted)' },
	{ tag: tags.quote, color: 'var(--md-muted)' }
]);

export function markdownTheme(): Extension {
	return [editorTheme, syntaxHighlighting(markdownHighlightStyle)];
}
