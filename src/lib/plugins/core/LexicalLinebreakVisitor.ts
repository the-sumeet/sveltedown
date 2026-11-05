import { $isLineBreakNode, type LineBreakNode } from 'lexical';
import type * as Mdast from 'mdast';
import type { LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';

export const LexicalLinebreakVisitor: LexicalExportVisitor<LineBreakNode, Mdast.Text> = {
	testLexicalNode: $isLineBreakNode,
	visitLexicalNode: ({ mdastParent, actions }) => {
		actions.appendToParent(mdastParent, { type: 'text', value: '\n' });
	}
};
