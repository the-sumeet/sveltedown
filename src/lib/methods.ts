import {
	activeEditor$,
	contentEditableRef$,
	exportVisitors$,
	insertMarkdown$,
	jsxComponentDescriptors$,
	jsxIsAvailable$,
	markdown$,
	markdownSourceEditorValue$,
	rootEditor$,
	setMarkdown$,
	toMarkdownExtensions$,
	toMarkdownOptions$,
	viewMode$
} from './plugins/core/index.js';
import type { Realm } from './realm/index.js';
import { getSelectionAsMarkdown } from './utils/lexicalHelpers.js';

/** Options for moving focus into the editor. */
export interface FocusOptions {
	defaultSelection?: 'rootStart' | 'rootEnd';
	preventScroll?: boolean;
}

/** The methods of a `MarkdownEditor` instance, available through `bind:this`. */
export interface MarkdownEditorMethods {
	/** Gets the current markdown value. */
	getMarkdown(): string;
	/** Replaces the markdown value of the editor. */
	setMarkdown(value: string): void;
	/** Inserts markdown at the current cursor position. Focus the editor first if necessary. */
	insertMarkdown(value: string): void;
	/** Moves focus into the editor. */
	focus(callback?: () => void, options?: FocusOptions): void;
	/** Gets the HTML of the Lexical `contenteditable` element. */
	getContentEditableHTML(): string;
	/**
	 * Gets the markdown of the selection in the active root or nested editor. Returns an empty
	 * string if there is no selection, if it's collapsed, or in source or diff mode.
	 */
	getSelectionMarkdown(): string;
}

/** @internal */
export function createMethods(realm: Realm): MarkdownEditorMethods {
	const inSourceMode = () => {
		const viewMode = realm.getValue(viewMode$);
		return viewMode === 'source' || viewMode === 'diff';
	};

	return {
		getMarkdown: () =>
			inSourceMode() ? realm.getValue(markdownSourceEditorValue$) : realm.getValue(markdown$),
		setMarkdown: (markdown) => {
			realm.pub(setMarkdown$, markdown);
		},
		insertMarkdown: (markdown) => {
			realm.pub(insertMarkdown$, markdown);
		},
		focus: (callback, options) => {
			realm.getValue(rootEditor$)?.focus(callback, options);
		},
		getContentEditableHTML: () => realm.getValue(contentEditableRef$)?.current.innerHTML ?? '',
		getSelectionMarkdown: () => {
			if (inSourceMode()) return '';
			const activeEditor = realm.getValue(activeEditor$);
			if (!activeEditor) return '';
			return getSelectionAsMarkdown(activeEditor, {
				visitors: realm.getValue(exportVisitors$),
				toMarkdownExtensions: realm.getValue(toMarkdownExtensions$),
				toMarkdownOptions: realm.getValue(toMarkdownOptions$),
				jsxComponentDescriptors: realm.getValue(jsxComponentDescriptors$),
				jsxIsAvailable: realm.getValue(jsxIsAvailable$)
			});
		}
	};
}
