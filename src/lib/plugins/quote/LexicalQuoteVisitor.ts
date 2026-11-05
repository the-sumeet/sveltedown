import { $isQuoteNode, type QuoteNode } from '@lexical/rich-text';
import type * as Mdast from 'mdast';
import type { LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';

export const LexicalQuoteVisitor: LexicalExportVisitor<QuoteNode, Mdast.Blockquote> = {
	testLexicalNode: $isQuoteNode,
	visitLexicalNode: ({ actions }) => {
		actions.addAndStepInto('blockquote');
	}
};
