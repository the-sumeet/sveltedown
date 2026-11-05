import { $createHeadingNode, $createQuoteNode, type HeadingTagType } from '@lexical/rich-text';
import { $createParagraphNode, type ElementNode } from 'lexical';
import type { BlockType } from '../../core/index.js';

/** Returns a factory for the Lexical node of a block type. */
export function blockNodeFactory(blockType: BlockType): () => ElementNode {
	switch (blockType) {
		case 'quote':
			return () => $createQuoteNode();
		case 'paragraph':
			return () => $createParagraphNode();
		case '':
			throw new Error('Unknown block type: empty');
		default:
			if (blockType.startsWith('h')) {
				return () => $createHeadingNode(blockType as HeadingTagType);
			}
			throw new Error(`Unknown block type: ${blockType}`);
	}
}
