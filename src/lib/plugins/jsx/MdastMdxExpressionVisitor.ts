import type { ElementNode } from 'lexical';
import type { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx';
import type { MdastImportVisitor } from '../../importMarkdownToLexical.js';
import { $createLexicalMdxExpressionNode } from './LexicalMdxExpressionNode.js';

export const MdastMdxExpressionVisitor: MdastImportVisitor<MdxTextExpression | MdxFlowExpression> =
	{
		testNode: (node) => node.type === 'mdxTextExpression' || node.type === 'mdxFlowExpression',
		visitNode({ lexicalParent, mdastNode }) {
			(lexicalParent as ElementNode).append(
				$createLexicalMdxExpressionNode(mdastNode.value, mdastNode.type)
			);
		},
		priority: -200
	};
