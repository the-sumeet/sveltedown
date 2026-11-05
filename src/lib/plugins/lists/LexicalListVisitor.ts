import { $isListNode, type ListNode } from '@lexical/list';
import type * as Mdast from 'mdast';
import type { LexicalExportVisitor } from '../../exportMarkdownFromLexical.js';

export const LexicalListVisitor: LexicalExportVisitor<ListNode, Mdast.List> = {
	testLexicalNode: $isListNode,
	visitLexicalNode: ({ lexicalNode, actions }) => {
		const ordered = lexicalNode.getListType() === 'number';
		actions.addAndStepInto('list', {
			ordered,
			...(ordered ? { start: lexicalNode.getStart() } : {}),
			spread: false
		});
	}
};
