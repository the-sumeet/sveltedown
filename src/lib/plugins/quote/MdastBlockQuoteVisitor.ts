import { $createQuoteNode } from '@lexical/rich-text';
import type * as Mdast from 'mdast';
import type { MdastImportVisitor } from '../../importMarkdownToLexical.js';

export const MdastBlockQuoteVisitor: MdastImportVisitor<Mdast.Blockquote> = {
	testNode: 'blockquote',
	visitNode({ actions }) {
		actions.addAndStepInto($createQuoteNode());
	}
};
