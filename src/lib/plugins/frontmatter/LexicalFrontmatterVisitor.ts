import type * as Mdast from 'mdast';
import type { LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';
import { type FrontmatterNode, $isFrontmatterNode } from './FrontmatterNode.js';

export const LexicalFrontmatterVisitor: LexicalExportVisitor<FrontmatterNode, Mdast.Yaml> = {
	testLexicalNode: $isFrontmatterNode,
	visitLexicalNode: ({ actions, lexicalNode }) => {
		actions.addAndStepInto('yaml', { value: lexicalNode.getYaml() });
	}
};
