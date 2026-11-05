import { $isHeadingNode, type HeadingNode } from '@lexical/rich-text';
import type * as Mdast from 'mdast';
import type { LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';

export const LexicalHeadingVisitor: LexicalExportVisitor<HeadingNode, Mdast.Heading> = {
	testLexicalNode: $isHeadingNode,
	visitLexicalNode: ({ lexicalNode, actions }) => {
		const depth = parseInt(lexicalNode.getTag()[1], 10) as Mdast.Heading['depth'];
		actions.addAndStepInto('heading', { depth });
	}
};
