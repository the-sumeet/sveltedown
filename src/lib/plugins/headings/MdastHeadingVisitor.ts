import { $createHeadingNode } from '@lexical/rich-text';
import type * as Mdast from 'mdast';
import type { MdastImportVisitor } from '../../importMarkdownToLexical.js';

export const MdastHeadingVisitor: MdastImportVisitor<Mdast.Heading> = {
	testNode: 'heading',
	visitNode: function ({ mdastNode, actions }): void {
		actions.addAndStepInto($createHeadingNode(`h${mdastNode.depth}`));
	}
};
