import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import { $isLexicalJsxNode, type LexicalJsxNode } from './LexicalJsxNode.js';
import type { LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';
import type * as Mdast from 'mdast';
import { isMdastJsxNode } from './index.js';
import { getComponentImport, withComponentImport } from './imports.js';

export const LexicalJsxVisitor: LexicalExportVisitor<
	LexicalJsxNode,
	MdxJsxFlowElement | MdxJsxTextElement
> = {
	testLexicalNode: $isLexicalJsxNode,
	visitLexicalNode({ actions, mdastParent, lexicalNode }) {
		function traverseNestedJsxNodes(node: Mdast.Nodes) {
			if ('children' in node && node.children instanceof Array) {
				node.children.forEach((child: Mdast.Nodes) => {
					if (isMdastJsxNode(child)) {
						actions.registerReferredComponent(child.name, getComponentImport(child));
					}
					traverseNestedJsxNodes(child);
				});
			}
		}

		const mdastNode = lexicalNode.getMdastNode();
		const importStatement = lexicalNode.getImportStatement();
		actions.registerReferredComponent(mdastNode.name, importStatement);
		traverseNestedJsxNodes(mdastNode);
		actions.appendToParent(
			mdastParent,
			importStatement ? withComponentImport(mdastNode, importStatement) : mdastNode
		);
	},
	priority: -200
};
