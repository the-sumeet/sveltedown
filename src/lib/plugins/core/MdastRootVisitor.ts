import type * as Mdast from 'mdast';
import { type MdastImportVisitor } from '../../importMarkdownToLexical.js';

export const MdastRootVisitor: MdastImportVisitor<Mdast.Root> = {
	testNode: 'root',
	visitNode({ actions, mdastNode, lexicalParent }) {
		actions.visitChildren(mdastNode as unknown as Mdast.Root, lexicalParent);
	}
};
