import { registerDragonSupport } from '@lexical/dragon';
import { registerRichText } from '@lexical/rich-text';
import { $canShowPlaceholderCurry } from '@lexical/text';
import { mergeRegister } from '@lexical/utils';
import type { LexicalEditor } from 'lexical';
import { registerSvelteDecorators } from './decorators.svelte.js';

/** Attributes of a Lexical `contenteditable` element, for root and nested editors. */
export interface ContentEditableOptions {
	ariaLabel?: string;
	spellCheck?: boolean;
}

/**
 * Makes `element` the visible surface of `editor`: rich text behaviour, decorators, and the
 * `contenteditable` attribute. This replaces @lexical/react's `RichTextPlugin` and `ContentEditable`.
 * `context` is passed on to decorator components.
 */
export function attachEditorSurface(
	editor: LexicalEditor,
	element: HTMLElement,
	context: Map<unknown, unknown>,
	options: ContentEditableOptions = {}
): () => void {
	const syncEditable = (editable: boolean) => {
		element.contentEditable = String(editable);
		element.tabIndex = editable ? 0 : -1;
		if (editable) element.removeAttribute('aria-readonly');
		else element.setAttribute('aria-readonly', 'true');
	};
	element.setAttribute('role', 'textbox');
	element.setAttribute('aria-multiline', 'true');
	if (options.ariaLabel) element.setAttribute('aria-label', options.ariaLabel);
	if (options.spellCheck !== undefined) element.spellcheck = options.spellCheck;
	syncEditable(editor.isEditable());

	const unregister = mergeRegister(
		registerRichText(editor),
		registerDragonSupport(editor),
		editor.registerEditableListener(syncEditable),
		registerSvelteDecorators(editor, context)
	);
	editor.setRootElement(element);

	return () => {
		editor.setRootElement(null);
		unregister();
	};
}

/** Calls `callback` when the placeholder of an empty, editable editor should show or hide. */
export function registerPlaceholder(
	editor: LexicalEditor,
	callback: (visible: boolean) => void
): () => void {
	const update = () => {
		const empty = editor.getEditorState().read($canShowPlaceholderCurry(editor.isComposing()));
		callback(empty && editor.isEditable());
	};
	update();
	return mergeRegister(
		editor.registerUpdateListener(update),
		editor.registerEditableListener(update)
	);
}
