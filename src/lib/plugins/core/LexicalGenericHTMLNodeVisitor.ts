import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import { $isGenericHTMLNode, type GenericHTMLNode } from './GenericHTMLNode.js';
import type { LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';

export const LexicalGenericHTMLVisitor: LexicalExportVisitor<
	GenericHTMLNode,
	MdxJsxFlowElement | MdxJsxTextElement
> = {
	testLexicalNode: $isGenericHTMLNode,
	visitLexicalNode({ actions, lexicalNode }) {
		actions.addAndStepInto('mdxJsxTextElement', {
			name: lexicalNode.getTag(),
			type: lexicalNode.getNodeType(),
			attributes: lexicalNode.getAttributes()
		});
	},
	priority: -100
};
