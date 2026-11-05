import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

// Colours that follow `color-scheme`, so code blocks and source mode match the editor's theme.
const keyword = 'light-dark(#5e00d7, #c4a1ff)';
const string = 'light-dark(#0a7d33, #7ee2a0)';
const number = 'light-dark(#b35900, #ffb86b)';
const comment = 'light-dark(#6b7280, #8b949e)';
const definition = 'light-dark(#0b5cad, #79b8ff)';
const type = 'light-dark(#00737a, #5fd9e0)';
const invalid = 'light-dark(#c62828, #ff8a80)';

/** The CodeMirror theme of code blocks, and of the source and diff modes. */
export const editorCodeTheme = [
	EditorView.theme({
		'&': {
			color: 'var(--baseTextContrast)',
			backgroundColor: 'var(--basePageBg)'
		},
		'.cm-content': { caretColor: 'var(--baseTextContrast)' },
		'.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--baseTextContrast)' },
		'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
			{ backgroundColor: 'var(--accentBgActive)' },
		'.cm-activeLine': { backgroundColor: 'var(--baseBgSubtle)' },
		'.cm-gutters': {
			backgroundColor: 'var(--baseBgSubtle)',
			color: 'var(--baseSolid)',
			border: 'none'
		},
		'.cm-activeLineGutter': { backgroundColor: 'var(--baseBgHover)' },
		'.cm-panels': { backgroundColor: 'var(--baseBg)', color: 'var(--baseTextContrast)' },
		'.cm-tooltip': { backgroundColor: 'var(--baseBase)', border: '1px solid var(--baseBorder)' }
	}),
	syntaxHighlighting(
		HighlightStyle.define([
			{ tag: [tags.keyword, tags.modifier, tags.operatorKeyword], color: keyword },
			{ tag: [tags.string, tags.special(tags.string), tags.regexp], color: string },
			{ tag: [tags.number, tags.bool, tags.null, tags.atom], color: number },
			{ tag: [tags.comment, tags.meta], color: comment, fontStyle: 'italic' },
			{
				tag: [tags.function(tags.variableName), tags.definition(tags.variableName)],
				color: definition
			},
			{ tag: [tags.typeName, tags.className, tags.namespace], color: type },
			{ tag: tags.propertyName, color: definition },
			{ tag: tags.heading, fontWeight: 'bold', color: definition },
			{ tag: tags.strong, fontWeight: 'bold' },
			{ tag: tags.emphasis, fontStyle: 'italic' },
			{ tag: tags.strikethrough, textDecoration: 'line-through' },
			{ tag: [tags.link, tags.url], color: definition, textDecoration: 'underline' },
			{ tag: tags.invalid, color: invalid }
		])
	)
];
