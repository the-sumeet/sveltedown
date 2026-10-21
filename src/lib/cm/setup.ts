import {
	Annotation,
	Compartment,
	EditorState,
	Transaction,
	type Extension
} from '@codemirror/state';
import { EditorView, placeholder as placeholderExtension } from '@codemirror/view';
import { history } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { inlineLivePreview } from './plugins/inline-live-preview.js';
import { blockWidgets, widgetSnippets, type WidgetSnippets } from './plugins/block-widgets.js';
import { editorKeymaps } from './keymaps.js';
import { markdownTheme } from './theme.js';

/** Marks transactions that sync the document from the `value` prop, so they are not echoed back. */
export const externalSync = Annotation.define<boolean>();

export interface EditorOptions {
	parent: HTMLElement;
	doc: string;
	readonly?: boolean;
	placeholder?: string;
	extensions?: Extension[];
	snippets?: WidgetSnippets;
	/** Called after user edits (not after `setDoc`). */
	onDocChange: (doc: string) => void;
}

export interface EditorController {
	view: EditorView;
	setDoc(doc: string): void;
	setReadonly(readonly: boolean): void;
	setPlaceholder(placeholder: string): void;
	setExtensions(extensions: Extension[]): void;
	setSnippets(snippets: WidgetSnippets): void;
	destroy(): void;
}

function readonlyExtension(readonly: boolean): Extension {
	return [EditorState.readOnly.of(readonly), EditorView.editable.of(!readonly)];
}

function placeholderFor(text: string): Extension {
	return text ? placeholderExtension(text) : [];
}

/** The built-in extensions, without the per-instance configurable parts. */
export function coreExtensions(): Extension[] {
	return [
		history(),
		markdown({ base: markdownLanguage }),
		EditorView.lineWrapping,
		inlineLivePreview(),
		blockWidgets(),
		markdownTheme(),
		editorKeymaps()
	];
}

/**
 * Minimal single change turning `from` into `to`, so the cursor and undo history
 * outside the edited region survive an external update.
 */
export function diffChange(from: string, to: string) {
	let start = 0;
	const max = Math.min(from.length, to.length);
	while (start < max && from.charCodeAt(start) === to.charCodeAt(start)) start++;
	let endFrom = from.length;
	let endTo = to.length;
	while (
		endFrom > start &&
		endTo > start &&
		from.charCodeAt(endFrom - 1) === to.charCodeAt(endTo - 1)
	) {
		endFrom--;
		endTo--;
	}
	return { from: start, to: endFrom, insert: to.slice(start, endTo) };
}

export function createEditor(options: EditorOptions): EditorController {
	const readonlyConf = new Compartment();
	const placeholderConf = new Compartment();
	const userConf = new Compartment();
	const snippetsConf = new Compartment();

	const view = new EditorView({
		parent: options.parent,
		state: EditorState.create({
			doc: options.doc,
			extensions: [
				coreExtensions(),
				readonlyConf.of(readonlyExtension(options.readonly ?? false)),
				placeholderConf.of(placeholderFor(options.placeholder ?? '')),
				snippetsConf.of(widgetSnippets.of(options.snippets ?? {})),
				EditorView.updateListener.of((update) => {
					if (!update.docChanged) return;
					if (update.transactions.some((tr) => tr.annotation(externalSync))) return;
					options.onDocChange(update.state.doc.toString());
				}),
				userConf.of(options.extensions ?? [])
			]
		})
	});

	return {
		view,
		setDoc(doc) {
			const current = view.state.doc.toString();
			if (doc === current) return;
			view.dispatch({
				changes: diffChange(current, doc),
				annotations: [externalSync.of(true), Transaction.addToHistory.of(false)]
			});
		},
		setReadonly(readonly) {
			view.dispatch({ effects: readonlyConf.reconfigure(readonlyExtension(readonly)) });
		},
		setPlaceholder(placeholder) {
			view.dispatch({ effects: placeholderConf.reconfigure(placeholderFor(placeholder)) });
		},
		setExtensions(extensions) {
			view.dispatch({ effects: userConf.reconfigure(extensions) });
		},
		setSnippets(snippets) {
			view.dispatch({ effects: snippetsConf.reconfigure(widgetSnippets.of(snippets)) });
		},
		destroy() {
			view.destroy();
		}
	};
}
