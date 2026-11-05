import { $isRootNode, type RootNode as LexicalRootNode } from 'lexical';
import type * as Mdast from 'mdast';
import { type LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';

export const LexicalRootVisitor: LexicalExportVisitor<LexicalRootNode, Mdast.Root> = {
	testLexicalNode: $isRootNode,
	visitLexicalNode: ({ actions }) => {
		actions.addAndStepInto('root');
	}
};
