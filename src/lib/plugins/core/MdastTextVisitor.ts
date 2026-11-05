import { $createTextNode } from 'lexical';
import type * as Mdast from 'mdast';
import { type MdastImportVisitor } from '../../importMarkdownToLexical.js';

export const MdastTextVisitor: MdastImportVisitor<Mdast.Text> = {
	testNode: 'text',
	visitNode({ mdastNode, actions }) {
		const node = $createTextNode(mdastNode.value);
		node.setFormat(actions.getParentFormatting());
		const style = actions.getParentStyle();
		if (style !== '') {
			node.setStyle(style);
		}
		actions.addAndStepInto(node);
	}
};
