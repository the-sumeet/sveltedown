export { default as MarkdownEditor } from './components/MarkdownEditor.svelte';
export type { MarkdownEditorProps, ImageSnippetProps, CodeHeaderSnippetProps } from './types.js';
export {
	createEditor,
	coreExtensions,
	externalSync,
	type EditorController,
	type EditorOptions
} from './cm/setup.js';
