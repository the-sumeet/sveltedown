import { $createHorizontalRuleNode } from '@lexical/extension';
import type * as Mdast from 'mdast';
import type { MdastImportVisitor } from '../../importMarkdownToLexical.js';

export const MdastThematicBreakVisitor: MdastImportVisitor<Mdast.ThematicBreak> = {
	testNode: 'thematicBreak',
	visitNode({ actions }) {
		actions.addAndStepInto($createHorizontalRuleNode());
	}
};
