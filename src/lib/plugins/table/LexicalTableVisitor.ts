import type * as Mdast from 'mdast';
import { type TableNode, $isTableNode } from './TableNode.js';
import type { LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';

export const LexicalTableVisitor: LexicalExportVisitor<TableNode, Mdast.Table> = {
	testLexicalNode: $isTableNode,
	visitLexicalNode({ actions, mdastParent, lexicalNode }) {
		actions.appendToParent(mdastParent, lexicalNode.getMdastNode());
	}
};
