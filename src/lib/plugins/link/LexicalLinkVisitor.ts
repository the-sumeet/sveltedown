import { $isLinkNode, type LinkNode } from '@lexical/link';
import type * as Mdast from 'mdast';
import type { LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';

export const LexicalLinkVisitor: LexicalExportVisitor<LinkNode, Mdast.Link> = {
	testLexicalNode: $isLinkNode,
	visitLexicalNode: ({ lexicalNode, actions }) => {
		actions.addAndStepInto('link', { url: lexicalNode.getURL(), title: lexicalNode.getTitle() });
	}
};
