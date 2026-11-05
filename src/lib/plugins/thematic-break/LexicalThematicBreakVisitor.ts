import { HorizontalRuleNode } from '@lexical/extension';
import type * as Mdast from 'mdast';
import type { LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';

export const LexicalThematicBreakVisitor: LexicalExportVisitor<
	HorizontalRuleNode,
	Mdast.ThematicBreak
> = {
	testLexicalNode: (node): node is HorizontalRuleNode => node instanceof HorizontalRuleNode,
	visitLexicalNode({ actions }) {
		actions.addAndStepInto('thematicBreak');
	}
};
