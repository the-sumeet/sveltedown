export { default as MarkdownEditor } from './components/MarkdownEditor.svelte';
export type { MarkdownEditorProps, ImageSnippetProps, CodeHeaderSnippetProps } from './types.js';
export {
	createEditor,
	coreExtensions,
	externalSync,
	type EditorController,
	type EditorOptions
} from './cm/setup.js';
export { inlineLivePreview, buildInlineDecorations } from './cm/plugins/inline-live-preview.js';
export {
	blockWidgets,
	buildBlockDecorations,
	widgetSnippets,
	type WidgetSnippets
} from './cm/plugins/block-widgets.js';
export { focusTracking, isCursorInRange, isRevealed, setEditorFocused } from './cm/utils/cursor.js';
export { toggleTask } from './cm/utils/tasks.js';
export { SvelteWidget, type SvelteWidgetOptions } from './cm/utils/svelte-widget.svelte.js';
export {
	editorKeymaps,
	formattingKeymap,
	insertLink,
	toggleBold,
	toggleItalic,
	toggleStrikethrough,
	toggleWrap
} from './cm/keymaps.js';
export { editorTheme, markdownHighlightStyle, markdownTheme } from './cm/theme.js';
