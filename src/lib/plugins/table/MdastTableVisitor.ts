import type { ElementNode } from 'lexical';
import type * as Mdast from 'mdast';
import type { MdastImportVisitor } from '../../importMarkdownToLexical.js';
import { $createTableNode } from './TableNode.js';

export const MdastTableVisitor: MdastImportVisitor<Mdast.Table> = {
	testNode: 'table',
	visitNode({ mdastNode, lexicalParent }) {
		(lexicalParent as ElementNode).append($createTableNode(mdastNode));
	}
};
