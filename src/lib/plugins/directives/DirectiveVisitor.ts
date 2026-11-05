import type { LeafDirective } from 'mdast-util-directive';
import type { LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';
import { $isDirectiveNode, type DirectiveNode } from './DirectiveNode.js';

export const DirectiveVisitor: LexicalExportVisitor<DirectiveNode, LeafDirective> = {
	testLexicalNode: $isDirectiveNode,
	visitLexicalNode({ actions, mdastParent, lexicalNode }) {
		actions.appendToParent(mdastParent, lexicalNode.getMdastNode());
	}
};
