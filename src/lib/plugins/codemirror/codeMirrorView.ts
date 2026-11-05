import { indentWithTab } from '@codemirror/commands';
import { languages } from '@codemirror/language-data';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { $createParagraphNode, $getNodeByKey, $setSelection, type LexicalEditor } from 'lexical';
import type { NormalizedCodeBlockLanguages } from './index.js';
import { editorCodeTheme } from './theme.js';

export const COMMON_STATE_CONFIG_EXTENSIONS: Extension[] = [];

/** Resolves the extension with syntax highlighting for a language, loading it if necessary. */
async function languageExtension(
	language: string,
	codeBlockLanguages: NormalizedCodeBlockLanguages,
	autoLoad: boolean
): Promise<Extension | null> {
	if (language === '') return null;
	const canonical = codeBlockLanguages.keyMap[language] ?? language;
	const provided = codeBlockLanguages.supportMap[canonical];
	if (provided) return provided.extension;
	if (!autoLoad) return null;
	const description = languages.find(
		(candidate) =>
			candidate.name === language ||
			candidate.alias.includes(language) ||
			candidate.extensions.includes(language)
	);
	if (!description) return null;
	try {
		return (await description.load()).extension;
	} catch {
		console.warn('failed to load language support for', language);
		return null;
	}
}

export interface CodeMirrorViewOptions {
	element: HTMLElement;
	code: string;
	language: string;
	readOnly: boolean;
	extensions: Extension[];
	languages: NormalizedCodeBlockLanguages;
	autoLoadLanguageSupport: boolean;
	parentEditor: LexicalEditor;
	onChange: (code: string) => void;
}

/**
 * Creates the view of a code block, once its language has loaded. Returns a teardown: loading can
 * outlast the view's owner, and must then not create an orphaned view.
 */
export function createCodeMirrorView(
	options: CodeMirrorViewOptions,
	onReady: (view: EditorView | null) => void
): () => void {
	let disposed = false;
	let view: EditorView | null = null;
	const stopPropagation = (event: KeyboardEvent) => {
		event.stopPropagation();
	};

	void languageExtension(options.language, options.languages, options.autoLoadLanguageSupport).then(
		(language) => {
			if (disposed) return;
			const extensions: Extension[] = [
				...options.extensions,
				basicSetup,
				editorCodeTheme,
				lineNumbers(),
				keymap.of([indentWithTab]),
				EditorView.lineWrapping,
				EditorView.updateListener.of(({ state }) => {
					options.onChange(state.doc.toString());
				}),
				EditorView.domEventHandlers({
					focus: () => {
						options.parentEditor.update(() => {
							$setSelection(null);
						});
					}
				})
			];
			if (options.readOnly) extensions.push(EditorState.readOnly.of(true));
			if (language) extensions.push(language);
			options.element.innerHTML = '';
			view = new EditorView({
				parent: options.element,
				state: EditorState.create({ doc: options.code, extensions })
			});
			options.element.addEventListener('keydown', stopPropagation);
			onReady(view);
		}
	);

	return () => {
		disposed = true;
		view?.destroy();
		view = null;
		options.element.removeEventListener('keydown', stopPropagation);
		onReady(null);
	};
}

/** Lets the user move out of the code block with the arrow keys, and delete it when empty. */
export function attachCodeMirrorKeyboard(
	view: EditorView,
	nodeKey: string,
	getActiveEditor: () => LexicalEditor | null,
	onFocus: () => void
): () => void {
	// These flags allow the user to escape the editor with arrows. They are set
	// when the cursor is at the top or bottom and cleared after the second arrow.
	let atBottom = false;
	let atTop = false;

	const onKeyDown = (event: KeyboardEvent) => {
		const { state } = view;
		if (event.key === 'ArrowDown') {
			if (state.doc.length === state.selection.ranges[0].to) {
				if (!atBottom) {
					atBottom = true;
				} else {
					getActiveEditor()?.update(() => {
						const node = $getNodeByKey(nodeKey);
						if (!node) return;
						if (node.getNextSibling()) {
							view.contentDOM.blur();
							node.selectNext();
						} else {
							node.insertAfter($createParagraphNode());
						}
					});
					atBottom = false;
				}
			}
		} else if (event.key === 'ArrowUp') {
			if (state.selection.ranges[0].from === 0) {
				if (!atTop) {
					atTop = true;
				} else {
					getActiveEditor()?.update(() => {
						const node = $getNodeByKey(nodeKey);
						if (node?.getPreviousSibling()) {
							view.contentDOM.blur();
							node.selectPrevious();
						}
					});
					atTop = false;
				}
			}
		} else if (event.key === 'Enter') {
			event.stopPropagation();
		} else if (event.key === 'Backspace' || event.key === 'Delete') {
			if (state.doc.length === 0) {
				getActiveEditor()?.update(() => {
					$getNodeByKey(nodeKey)?.remove();
				});
			}
		}
	};

	view.contentDOM.addEventListener('focus', onFocus);
	view.contentDOM.addEventListener('keydown', onKeyDown);
	return () => {
		view.contentDOM.removeEventListener('focus', onFocus);
		view.contentDOM.removeEventListener('keydown', onKeyDown);
	};
}
