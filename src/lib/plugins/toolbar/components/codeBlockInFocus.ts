import type { LexicalNode } from 'lexical';
import { $isCodeBlockNode, type CodeBlockNode } from '../../codeblock/CodeBlockNode.js';

/** Narrows the root node of the editor in focus to a code block. */
export function asCodeBlockNode(node: LexicalNode | null | undefined): CodeBlockNode | null {
	return $isCodeBlockNode(node) ? node : null;
}
