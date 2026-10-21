import type { Snippet } from 'svelte';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

/** Props passed to a custom `imageSnippet`. */
export interface ImageSnippetProps {
	src: string;
	alt: string;
	title?: string;
	view: EditorView;
}

/** Props passed to a custom `codeHeaderSnippet`. */
export interface CodeHeaderSnippetProps {
	/** First word of the fence's info string, e.g. `ts` for ` ```ts title="a.ts" `. */
	language: string;
	/** The whole info string, for headers that show titles or other metadata. */
	info: string;
	code: string;
	view: EditorView;
}

export interface MarkdownEditorProps {
	/** Markdown source. Supports `bind:value`. */
	value?: string;
	placeholder?: string;
	readonly?: boolean;
	class?: string;
	/** Called with the new Markdown whenever the user edits the document. */
	onchange?: (value: string) => void;
	/** Replaces the default image preview widget. */
	imageSnippet?: Snippet<[ImageSnippetProps]>;
	/** Replaces the default fenced code block header widget. */
	codeHeaderSnippet?: Snippet<[CodeHeaderSnippetProps]>;
	/** Extra CodeMirror extensions appended after the built-in ones. */
	extensions?: Extension[];
}
