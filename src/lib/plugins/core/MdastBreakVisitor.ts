import { $createLineBreakNode, type ElementNode } from 'lexical';
import type * as Mdast from 'mdast';
import { type MdastImportVisitor } from '../../importMarkdownToLexical.js';

export const MdastBreakVisitor: MdastImportVisitor<Mdast.Paragraph> = {
	testNode: 'break',
	visitNode: function ({ lexicalParent }): void {
		(lexicalParent as ElementNode).append($createLineBreakNode());
	}
};
