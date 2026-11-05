import { markdown as markdownLanguageSupport } from '@codemirror/lang-markdown';
import type { Extension } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { editorCodeTheme } from '../codemirror/theme.js';

export const COMMON_STATE_CONFIG_EXTENSIONS: Extension[] = [
	basicSetup,
	editorCodeTheme,
	markdownLanguageSupport(),
	lineNumbers(),
	EditorView.lineWrapping
];
