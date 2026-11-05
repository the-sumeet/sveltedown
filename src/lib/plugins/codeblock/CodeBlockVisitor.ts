import type * as Mdast from 'mdast';
import { $isCodeBlockNode, type CodeBlockNode } from './CodeBlockNode.js';
import type { LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';

export const CodeBlockVisitor: LexicalExportVisitor<CodeBlockNode, Mdast.Code> = {
	testLexicalNode: $isCodeBlockNode,
	visitLexicalNode: ({ lexicalNode, actions }) => {
		actions.addAndStepInto('code', {
			value: lexicalNode.getCode(),
			lang: lexicalNode.getLanguage(),
			meta: lexicalNode.getMeta()
		});
	}
};
