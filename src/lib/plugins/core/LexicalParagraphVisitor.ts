import { $isParagraphNode, type ParagraphNode } from 'lexical';
import type * as Mdast from 'mdast';
import { type LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';

export const LexicalParagraphVisitor: LexicalExportVisitor<ParagraphNode, Mdast.Paragraph> = {
	testLexicalNode: $isParagraphNode,
	visitLexicalNode: ({ actions }) => {
		actions.addAndStepInto('paragraph');
	}
};
