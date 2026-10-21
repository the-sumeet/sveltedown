import { syntaxTree } from '@codemirror/language';
import {
	Facet,
	Prec,
	StateField,
	type EditorState,
	type Extension,
	type Range
} from '@codemirror/state';
import { Decoration, EditorView, WidgetType, keymap, type DecorationSet } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import type { Component, Snippet } from 'svelte';
import type { CodeHeaderSnippetProps, ImageSnippetProps, TableSnippetProps } from '../../types.js';
import { isRevealed, revealInputsChanged } from '../utils/cursor.js';
import { SvelteWidget } from '../utils/svelte-widget.svelte.js';
import { codeBlockKeymap, fencedCodeParts } from '../utils/code-blocks.js';
import { linkDestination, linkTitle } from '../utils/syntax.js';
import { tableData } from '../utils/tables.js';
import ImageWidget from '../../components/widgets/ImageWidget.svelte';
import CheckboxWidget from '../../components/widgets/CheckboxWidget.svelte';
import CodeBlockWidget from '../../components/widgets/CodeBlockWidget.svelte';
import SnippetHost from '../../components/widgets/SnippetHost.svelte';
import TableWidget from '../../components/widgets/TableWidget.svelte';

export interface WidgetSnippets {
	image?: Snippet<[ImageSnippetProps]>;
	codeHeader?: Snippet<[CodeHeaderSnippetProps]>;
	table?: Snippet<[TableSnippetProps]>;
}

/** User snippets that replace the default widgets. */
export const widgetSnippets = Facet.define<WidgetSnippets, WidgetSnippets>({
	combine: (values) => values[0] ?? {}
});

const snippetHost = SnippetHost as unknown as Component<Record<string, unknown>>;

class HorizontalRuleWidget extends WidgetType {
	eq() {
		return true;
	}
	toDOM() {
		const dom = document.createElement('span');
		dom.className = 'cm-md-hr';
		dom.setAttribute('role', 'separator');
		return dom;
	}
}
const horizontalRule = Decoration.replace({ widget: new HorizontalRuleWidget() });

const codeLine = Decoration.line({ class: 'cm-md-codeblock' });
const codeLineBegin = Decoration.line({ class: 'cm-md-codeblock cm-md-codeblock-begin' });
const codeLineEnd = Decoration.line({ class: 'cm-md-codeblock cm-md-codeblock-end' });
const codeLineSingle = Decoration.line({
	class: 'cm-md-codeblock cm-md-codeblock-begin cm-md-codeblock-end'
});

/** A widget for the user's snippet if one is configured, else for the default component. */
function snippetOr<P extends Record<string, unknown>>(
	snippet: Snippet<[never]> | undefined,
	component: Component<P & { view: EditorView }>,
	props: P,
	className: string,
	block = false
): SvelteWidget {
	const options = { class: className, block };
	if (snippet)
		return new SvelteWidget<Record<string, unknown>>(snippetHost, { snippet, ...props }, options);
	return new SvelteWidget<Record<string, unknown>>(
		component as unknown as typeof snippetHost,
		props,
		options
	);
}

function addImage(state: EditorState, node: SyntaxNode, out: Range<Decoration>[]) {
	if (isRevealed(state, node.from, node.to)) return;
	const marks = node.getChildren('LinkMark');
	const url = node.getChild('URL');
	if (!url || marks.length < 2) return;
	const title = node.getChild('LinkTitle');
	const props = {
		src: linkDestination(state, url),
		alt: state.sliceDoc(marks[0].to, marks[1].from),
		title: title ? linkTitle(state, title) : undefined
	};
	const snippet = state.facet(widgetSnippets).image;
	const widget = snippetOr(snippet, ImageWidget, props, 'cm-md-image');
	out.push(Decoration.replace({ widget }).range(node.from, node.to));
}

/** The range a block node's decorations live in. Code blocks and tables reveal per whole line. */
function extentOf(state: EditorState, node: SyntaxNode): { from: number; to: number } {
	if (node.name !== 'FencedCode' && node.name !== 'Table') return { from: node.from, to: node.to };
	return { from: state.doc.lineAt(node.from).from, to: state.doc.lineAt(node.to).to };
}

/**
 * Away from the cursor the block becomes one scrollable widget, starting at the fence
 * so container markup before it (a list bullet, `>`) stays visible. Near it, the raw
 * lines are styled and do not wrap.
 */
function addFencedCode(state: EditorState, node: SyntaxNode, out: Range<Decoration>[]) {
	const { from, to } = extentOf(state, node);
	const first = state.doc.lineAt(from).number;
	const last = state.doc.lineAt(to).number;

	if (isRevealed(state, from, to)) {
		for (let n = first; n <= last; n++) {
			const deco =
				first === last
					? codeLineSingle
					: n === first
						? codeLineBegin
						: n === last
							? codeLineEnd
							: codeLine;
			out.push(deco.range(state.doc.line(n).from));
		}
		return;
	}

	const { language, info, code } = fencedCodeParts(state, node);
	const widget = new SvelteWidget(
		CodeBlockWidget,
		{ language, info, code, headerSnippet: state.facet(widgetSnippets).codeHeader },
		{ block: true, class: 'cm-md-codeblock-widget' }
	);
	out.push(Decoration.replace({ widget, block: true }).range(node.from, to));
}

const tableLine = Decoration.line({ class: 'cm-md-table-line' });

/**
 * Away from the cursor a table renders as an HTML table, starting at its first pipe so
 * container markup stays visible. Near it, the raw rows show unwrapped in monospace,
 * so the pipes line up (see `formatTable`).
 */
function addTable(state: EditorState, node: SyntaxNode, out: Range<Decoration>[]) {
	const { from, to } = extentOf(state, node);
	if (isRevealed(state, from, to)) {
		for (let n = state.doc.lineAt(from).number; n <= state.doc.lineAt(to).number; n++) {
			out.push(tableLine.range(state.doc.line(n).from));
		}
		return;
	}
	const snippet = state.facet(widgetSnippets).table;
	const widget = snippetOr(
		snippet,
		TableWidget,
		{ table: tableData(state, node) },
		'cm-md-table',
		true
	);
	out.push(Decoration.replace({ widget, block: true }).range(node.from, to));
}

const BLOCK_NODES = new Set(['Image', 'TaskMarker', 'HorizontalRule', 'FencedCode', 'Table']);

/** Adds decorations for the block nodes overlapping `[from, to]`, reporting each node's extent. */
function collect(
	state: EditorState,
	from: number,
	to: number,
	out: Range<Decoration>[],
	onNode?: (extent: { from: number; to: number }) => void
) {
	syntaxTree(state).iterate({
		from,
		to,
		enter: (ref) => {
			if (!BLOCK_NODES.has(ref.name)) return;
			onNode?.(extentOf(state, ref.node));
			switch (ref.name) {
				case 'Image':
					addImage(state, ref.node, out);
					break;
				case 'TaskMarker': {
					const checked = /^\[[xX]\]$/.test(state.sliceDoc(ref.from, ref.to));
					const widget = new SvelteWidget(CheckboxWidget, { checked }, { class: 'cm-md-task' });
					out.push(Decoration.replace({ widget }).range(ref.from, ref.to));
					break;
				}
				case 'HorizontalRule':
					if (!isRevealed(state, ref.from, ref.to))
						out.push(horizontalRule.range(ref.from, ref.to));
					break;
				case 'FencedCode':
					addFencedCode(state, ref.node, out);
					break;
				case 'Table':
					addTable(state, ref.node, out);
					break;
			}
			return false;
		}
	});
}

/**
 * Widget decorations for images, task checkboxes, horizontal rules and fenced code.
 * Pure, so it can be tested against an `EditorState` without a DOM.
 */
export function buildBlockDecorations(state: EditorState): DecorationSet {
	const out: Range<Decoration>[] = [];
	collect(state, 0, state.doc.length, out);
	return Decoration.set(out, true);
}

/**
 * After a selection-only change, only nodes on lines touched by the old or new
 * selection can switch between rendered and revealed: rebuild just those.
 */
function updateForSelection(
	decorations: DecorationSet,
	startState: EditorState,
	state: EditorState
): DecorationSet {
	const extents = new Map<number, { from: number; to: number }>();
	const out: Range<Decoration>[] = [];
	for (const range of [...startState.selection.ranges, ...state.selection.ranges]) {
		const from = state.doc.lineAt(range.from).from;
		const to = state.doc.lineAt(range.to).to;
		collect(state, from, to, [], (extent) => extents.set(extent.from, extent));
	}
	if (!extents.size) return decorations;
	for (const extent of extents.values()) collect(state, extent.from, extent.to, out);
	const inside = (from: number, to: number) =>
		[...extents.values()].some((e) => from >= e.from && to <= e.to);
	return decorations.update({
		filter: (from, to) => !inside(from, to),
		add: out.filter((range) => inside(range.from, range.to)),
		sort: true
	});
}

/** Block and widget decorations. A StateField, since some of them change line layout. */
export const blockWidgetsField = StateField.define<DecorationSet>({
	create: buildBlockDecorations,
	update(decorations, tr) {
		if (
			tr.docChanged ||
			syntaxTree(tr.state) !== syntaxTree(tr.startState) ||
			tr.state.facet(widgetSnippets) !== tr.startState.facet(widgetSnippets) ||
			revealInputsChanged(tr.startState, tr.state)
		) {
			return buildBlockDecorations(tr.state);
		}
		if (tr.selection) return updateForSelection(decorations, tr.startState, tr.state);
		return decorations;
	},
	provide: (field) => EditorView.decorations.from(field)
});

const blockTheme = EditorView.baseTheme({
	'.cm-md-image': { display: 'inline-block', maxWidth: '100%', verticalAlign: 'bottom' },
	'.cm-md-image img': { display: 'block', maxWidth: '100%', borderRadius: '4px' },
	'.cm-md-image-error': {
		display: 'inline-block',
		padding: '0.2em 0.5em',
		border: '1px dashed var(--md-border)',
		borderRadius: '4px',
		color: 'var(--md-muted)'
	},
	'.cm-md-task': { display: 'inline-block', verticalAlign: 'middle' },
	'.cm-md-checkbox': {
		margin: '0 0.25em 0 0',
		cursor: 'pointer',
		accentColor: 'var(--md-accent)'
	},
	'.cm-md-hr': {
		display: 'inline-block',
		width: '100%',
		verticalAlign: 'middle',
		borderTop: '1px solid var(--md-border)'
	},
	// Raw lines while editing: no wrapping; the editor scrolls sideways to the cursor.
	// `width: 0; min-width: 100%` keeps a long line from widening the content (which
	// would stop every paragraph from wrapping); the text overflows into the scroller.
	// Same font size and line height as the rendered <pre>, so the block keeps its height.
	'.cm-line.cm-md-codeblock': {
		fontFamily: 'var(--md-font-mono)',
		fontSize: '0.9em',
		lineHeight: '1.5',
		backgroundColor: 'var(--md-code-block-bg)',
		padding: '0 0.75em',
		boxSizing: 'border-box',
		width: '0',
		minWidth: '100%',
		whiteSpace: 'pre',
		wordBreak: 'normal',
		overflowWrap: 'normal'
	},
	'.cm-md-codeblock-begin': { borderTopLeftRadius: '6px', borderTopRightRadius: '6px' },
	'.cm-md-codeblock-end': { borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px' },
	// Rendered block: the <pre> scrolls on its own.
	'.cm-md-codeblock-widget': {
		// The editor content preserves whitespace; template whitespace here must not render.
		whiteSpace: 'normal',
		fontFamily: 'var(--md-font-mono)',
		fontSize: '0.9em',
		backgroundColor: 'var(--md-code-block-bg)',
		borderRadius: '6px',
		padding: '0.2em 0.75em'
	},
	'.cm-md-code-header': {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		fontSize: '0.85em',
		color: 'var(--md-muted)'
	},
	'.cm-md-code-pre': {
		margin: '0',
		padding: '0.2em 0',
		width: '0',
		minWidth: '100%',
		overflowX: 'auto',
		whiteSpace: 'pre',
		font: 'inherit',
		lineHeight: '1.5',
		outline: 'none',
		cursor: 'text'
	},
	// Raw table rows while editing: monospace and unwrapped, like code lines.
	'.cm-line.cm-md-table-line': {
		fontFamily: 'var(--md-font-mono)',
		fontSize: '0.9em',
		boxSizing: 'border-box',
		width: '0',
		minWidth: '100%',
		whiteSpace: 'pre',
		wordBreak: 'normal',
		overflowWrap: 'normal'
	},
	// The editor content breaks words anywhere (`overflow-wrap: anywhere`); inherited,
	// that would crush a wide table into one-letter columns instead of scrolling it.
	'.cm-md-table': {
		whiteSpace: 'normal',
		overflowWrap: 'normal',
		wordBreak: 'normal',
		padding: '0.25em 0'
	},
	'.cm-md-table-scroll': { width: '0', minWidth: '100%', overflowX: 'auto', outline: 'none' },
	'.cm-md-table table': { borderCollapse: 'collapse' },
	'.cm-md-table th, .cm-md-table td': {
		border: '1px solid var(--md-border)',
		padding: '0.3em 0.75em',
		textAlign: 'left',
		verticalAlign: 'top'
	},
	// Headers stay on one line, so many columns overflow into the scroll box; body
	// cells still wrap between words.
	'.cm-md-table th': {
		fontWeight: '600',
		whiteSpace: 'nowrap',
		backgroundColor: 'var(--md-code-block-bg)'
	},
	// The UA `code { font-family: monospace }` would shrink the font (monospace quirk).
	'.cm-md-code-pre code': { font: 'inherit' },
	'.cm-md-code-copy': {
		font: 'inherit',
		color: 'inherit',
		cursor: 'pointer',
		background: 'transparent',
		border: '1px solid var(--md-border)',
		borderRadius: '4px',
		padding: '0 0.5em'
	}
});

/** Images, task checkboxes, horizontal rules, fenced code blocks and tables as widgets. */
export function blockWidgets(): Extension {
	return [blockWidgetsField, blockTheme, Prec.high(keymap.of(codeBlockKeymap))];
}
