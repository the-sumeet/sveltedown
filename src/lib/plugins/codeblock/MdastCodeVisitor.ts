import type * as Mdast from 'mdast';
import { $createCodeBlockNode } from './CodeBlockNode.js';
import type { MdastImportVisitor } from '../../importMarkdownToLexical.js';
import { findCodeBlockDescriptor } from './findCodeBlockDescriptor.js';

export const MdastCodeVisitor: MdastImportVisitor<Mdast.Code> = {
	testNode: (node, { codeBlockEditorDescriptors, defaultCodeBlockLanguage }) => {
		if (node.type === 'code') {
			const descriptor = findCodeBlockDescriptor(
				codeBlockEditorDescriptors,
				node.lang,
				node.meta,
				defaultCodeBlockLanguage
			);
			return descriptor !== undefined;
		}
		return false;
	},
	visitNode({ mdastNode, actions }) {
		actions.addAndStepInto(
			$createCodeBlockNode({
				code: mdastNode.value,
				language: mdastNode.lang ?? '',
				meta: mdastNode.meta ?? ''
			})
		);
	}
};
