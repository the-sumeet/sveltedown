import type { ElementNode } from 'lexical';
import type { MdxJsxTextElement } from 'mdast-util-mdx';
import { $createLexicalJsxNode } from './LexicalJsxNode.js';
import type { MdastImportVisitor } from '../../importMarkdownToLexical.js';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { getComponentImport } from './imports.js';

export const MdastMdxJsxElementVisitor: MdastImportVisitor<MdxJsxTextElement | MdxJsxFlowElement> =
	{
		testNode: (node, { jsxComponentDescriptors }) => {
			if (node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement') {
				const descriptor =
					jsxComponentDescriptors.find((descriptor) => descriptor.name === node.name) ??
					jsxComponentDescriptors.find((descriptor) => descriptor.name === '*');
				return descriptor !== undefined;
			}
			return false;
		},
		visitNode({ lexicalParent, mdastNode, metaData }) {
			(lexicalParent as ElementNode).append(
				$createLexicalJsxNode(
					mdastNode,
					getComponentImport(mdastNode) ??
						(mdastNode.name ? metaData.importDeclarations[mdastNode.name.split('.')[0]] : undefined)
				)
			);
		},
		priority: -200,
		jsxKindReconciliationOwner: true
	};
