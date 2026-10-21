import { syntaxTree } from '@codemirror/language';
import type { EditorState, Extension, Range } from '@codemirror/state';
import {
	Decoration,
	EditorView,
	ViewPlugin,
	type DecorationSet,
	type ViewUpdate
} from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import { isRevealed, revealInputsChanged } from '../utils/cursor.js';
import { linkDestination } from '../utils/syntax.js';
import { openLink } from '../utils/links.js';

/** Replacement that hides a piece of Markdown syntax. */
export const hiddenMarkup = Decoration.replace({});

const headingLines = [1, 2, 3, 4, 5, 6].map((level) =>
	Decoration.line({ class: `cm-md-heading cm-md-h${level}` })
);
const strong = Decoration.mark({ class: 'cm-md-strong' });
const emphasis = Decoration.mark({ class: 'cm-md-em' });
const strikethrough = Decoration.mark({ class: 'cm-md-strikethrough' });
const inlineCode = Decoration.mark({ class: 'cm-md-code' });

const inlineStyles: Record<string, { deco: Decoration; markName: string }> = {
	StrongEmphasis: { deco: strong, markName: 'EmphasisMark' },
	Emphasis: { deco: emphasis, markName: 'EmphasisMark' },
	Strikethrough: { deco: strikethrough, markName: 'StrikethroughMark' }
};

function addHeading(state: EditorState, node: SyntaxNode, level: number, out: Range<Decoration>[]) {
	const line = state.doc.lineAt(node.from);
	out.push(headingLines[level - 1].range(line.from));
	if (isRevealed(state, line.from, line.to)) return;

	for (const mark of node.getChildren('HeaderMark')) {
		let { from, to } = mark;
		if (state.doc.sliceString(node.from, mark.from).trim() === '') {
			// Opening `#`s: also hide the spaces that follow.
			while (to < node.to && /\s/.test(state.doc.sliceString(to, to + 1))) to++;
		} else {
			// Closing `#`s: also hide the spaces before them.
			while (from > node.from && /\s/.test(state.doc.sliceString(from - 1, from))) from--;
		}
		if (from < to) out.push(hiddenMarkup.range(from, to));
	}
}

function addLink(state: EditorState, node: SyntaxNode, out: Range<Decoration>[]) {
	const marks = node.getChildren('LinkMark');
	const url = node.getChild('URL');
	// Only inline links `[text](url)`; reference links stay as source.
	if (!url || marks.length < 2) return;
	const [open, close] = marks;
	if (close.from > open.to) {
		out.push(
			Decoration.mark({
				class: 'cm-md-link',
				attributes: { 'data-url': linkDestination(state, url) }
			}).range(open.to, close.from)
		);
	}
	if (isRevealed(state, node.from, node.to)) return;
	out.push(hiddenMarkup.range(open.from, open.to));
	out.push(hiddenMarkup.range(close.from, node.to));
}

/**
 * Inline live-preview decorations for the given ranges. Pure, so it can be tested
 * against an `EditorState` without a DOM.
 */
export function buildInlineDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[]
): DecorationSet {
	const out: Range<Decoration>[] = [];
	const tree = syntaxTree(state);

	for (const { from, to } of ranges) {
		tree.iterate({
			from,
			to,
			enter: (ref) => {
				const name = ref.name;
				// Rendered as widgets by the block field; decorating inside them would collide.
				// Tables also stay fully raw while revealed, so their pipes line up.
				if (name === 'Image' || name === 'Table') return false;
				const heading = /^ATXHeading([1-6])$/.exec(name);
				if (heading) {
					addHeading(state, ref.node, Number(heading[1]), out);
					return;
				}

				const style = inlineStyles[name];
				if (style) {
					out.push(style.deco.range(ref.from, ref.to));
					if (!isRevealed(state, ref.from, ref.to)) {
						for (const mark of ref.node.getChildren(style.markName)) {
							out.push(hiddenMarkup.range(mark.from, mark.to));
						}
					}
					return;
				}

				if (name === 'InlineCode') {
					const marks = ref.node.getChildren('CodeMark');
					if (marks.length < 2) return false;
					const [open, close] = [marks[0], marks[marks.length - 1]];
					if (close.from > open.to) out.push(inlineCode.range(open.to, close.from));
					if (!isRevealed(state, ref.from, ref.to)) {
						out.push(hiddenMarkup.range(open.from, open.to));
						out.push(hiddenMarkup.range(close.from, close.to));
					}
					return false;
				}

				if (name === 'Link') addLink(state, ref.node, out);
			}
		});
	}

	return Decoration.set(out, true);
}

const inlinePlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildInlineDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			if (
				update.docChanged ||
				update.viewportChanged ||
				update.selectionSet ||
				syntaxTree(update.state) !== syntaxTree(update.startState) ||
				revealInputsChanged(update.startState, update.state)
			) {
				this.decorations = buildInlineDecorations(update.state, update.view.visibleRanges);
			}
		}
	},
	{ decorations: (plugin) => plugin.decorations }
);

// Mod-click opens a link; a plain click places the cursor (revealing the source).
// In a read-only editor a plain click opens it.
const linkClickHandler = EditorView.domEventHandlers({
	mousedown(event, view) {
		const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('.cm-md-link');
		const url = target?.dataset.url;
		if (!url || event.button !== 0) return false;
		if (!(event.metaKey || event.ctrlKey || !view.state.facet(EditorView.editable))) return false;
		event.preventDefault();
		openLink(url);
		return true;
	}
});

// Colours and fonts come from the `--md-*` variables in `styles/editor.css`.
const inlineTheme = EditorView.baseTheme({
	'.cm-md-heading': { fontWeight: '700', lineHeight: '1.3', color: 'var(--md-heading-color)' },
	'.cm-md-h1': { fontSize: '2em', paddingTop: '0.4em' },
	'.cm-md-h2': { fontSize: '1.6em', paddingTop: '0.35em' },
	'.cm-md-h3': { fontSize: '1.35em', paddingTop: '0.3em' },
	'.cm-md-h4': { fontSize: '1.15em', paddingTop: '0.25em' },
	'.cm-md-h5': { fontSize: '1em', paddingTop: '0.2em' },
	'.cm-md-h6': { fontSize: '0.9em', paddingTop: '0.2em', color: 'var(--md-muted)' },
	'.cm-md-strong': { fontWeight: '700' },
	'.cm-md-em': { fontStyle: 'italic' },
	'.cm-md-strikethrough': { textDecoration: 'line-through' },
	'.cm-md-code': {
		fontFamily: 'var(--md-font-mono)',
		fontSize: '0.9em',
		backgroundColor: 'var(--md-code-bg)',
		borderRadius: '4px',
		padding: '0.1em 0.3em'
	},
	'.cm-md-link': {
		color: 'var(--md-link-color)',
		textDecoration: 'underline',
		textUnderlineOffset: '0.15em',
		cursor: 'pointer'
	}
});

/** Hides inline Markdown syntax (headings, emphasis, code, links) away from the cursor. */
export function inlineLivePreview(): Extension {
	return [inlinePlugin, linkClickHandler, inlineTheme];
}
