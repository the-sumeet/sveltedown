import type {
	EditorConfig,
	LexicalEditor,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread
} from 'lexical';
import { DecoratorNode } from 'lexical';
import JsxEditorContainer from './JsxEditorContainer.svelte';
import type { SvelteDecorator } from '../core/decorators.svelte.js';
import type { MdastJsx } from './index.js';
import { voidEmitter } from '../../utils/voidEmitter.js';
import type { ImportStatement } from '../../importMarkdownToLexical.js';

/**
 * A serialized representation of an {@link LexicalJsxNode}.
 */
export type SerializedLexicalJsxNode = Spread<
	{
		mdastNode: MdastJsx;
		importStatement: ImportStatement | undefined;
		type: 'jsx';
		version: 1;
	},
	SerializedLexicalNode
>;

/**
 * A lexical node that represents an image. Use {@link "$createLexicalJsxNode"} to construct one.
 */
export class LexicalJsxNode extends DecoratorNode<SvelteDecorator> {
	__mdastNode: MdastJsx;
	__focusEmitter = voidEmitter();
	__importStatement?: ImportStatement;

	static getType(): string {
		return 'jsx';
	}

	static clone(node: LexicalJsxNode): LexicalJsxNode {
		return new LexicalJsxNode(
			structuredClone(node.__mdastNode),
			structuredClone(node.__importStatement),
			node.__key
		);
	}

	static importJSON(serializedNode: SerializedLexicalJsxNode): LexicalJsxNode {
		return $createLexicalJsxNode(serializedNode.mdastNode, serializedNode.importStatement);
	}

	constructor(mdastNode: MdastJsx, importStatement?: ImportStatement, key?: NodeKey) {
		super(key);
		this.__mdastNode = mdastNode;
		this.__importStatement = importStatement;
	}

	getMdastNode(): MdastJsx {
		return this.__mdastNode;
	}

	getImportStatement(): ImportStatement | undefined {
		return this.__importStatement;
	}

	exportJSON(): SerializedLexicalJsxNode {
		return {
			mdastNode: this.getMdastNode(),
			importStatement: this.getImportStatement(),
			type: 'jsx',
			version: 1
		};
	}

	createDOM(): HTMLElement {
		return document.createElement(this.__mdastNode.type === 'mdxJsxTextElement' ? 'span' : 'div');
	}

	updateDOM(): false {
		return false;
	}

	setMdastNode(mdastNode: MdastJsx): void {
		this.getWritable().__mdastNode = mdastNode;
	}

	select = () => {
		this.__focusEmitter.publish();
	};

	decorate(parentEditor: LexicalEditor, config: EditorConfig): SvelteDecorator {
		return {
			component: JsxEditorContainer,
			props: {
				lexicalJsxNode: this,
				config,
				mdastNode: this.getMdastNode(),
				parentEditor,
				focusEmitter: this.__focusEmitter
			}
		};
	}

	isInline(): boolean {
		return this.__mdastNode.type === 'mdxJsxTextElement';
	}

	isKeyboardSelectable(): boolean {
		return true;
	}
}

/**
 * Creates an {@link LexicalJsxNode}.
 */
export function $createLexicalJsxNode(
	mdastNode: MdastJsx,
	importStatement?: ImportStatement
): LexicalJsxNode {
	return new LexicalJsxNode(mdastNode, importStatement);
}

/**
 * Returns true if the node is an {@link LexicalJsxNode}.
 */
export function $isLexicalJsxNode(node: LexicalNode | null | undefined): node is LexicalJsxNode {
	return node instanceof LexicalJsxNode;
}
