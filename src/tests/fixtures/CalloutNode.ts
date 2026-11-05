import {
	DecoratorNode,
	type EditorConfig,
	type ElementNode,
	type LexicalEditor,
	type NodeKey
} from 'lexical';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { LexicalExportVisitor, MdastImportVisitor, SvelteDecorator } from '#lib';
import { voidEmitter } from '#lib';
import CalloutEditor from './CalloutEditor.svelte';

/** A minimal decorator with a nested editor: `<Callout>` elements in flow position. */
export class CalloutNode extends DecoratorNode<SvelteDecorator> {
	__mdastNode: MdxJsxFlowElement;
	__focusEmitter = voidEmitter();

	static getType() {
		return 'test-callout';
	}

	static clone(node: CalloutNode) {
		return new CalloutNode(node.__mdastNode, node.__key);
	}

	static importJSON() {
		throw new Error('not used');
		return null as unknown as CalloutNode;
	}

	constructor(mdastNode: MdxJsxFlowElement, key?: NodeKey) {
		super(key);
		this.__mdastNode = mdastNode;
	}

	getMdastNode() {
		return this.getLatest().__mdastNode;
	}

	setMdastNode(mdastNode: MdxJsxFlowElement) {
		this.getWritable().__mdastNode = mdastNode;
	}

	createDOM() {
		const element = document.createElement('div');
		element.dataset.testid = 'callout';
		return element;
	}

	updateDOM() {
		return false;
	}

	isInline() {
		return false;
	}

	decorate(parentEditor: LexicalEditor, config: EditorConfig): SvelteDecorator {
		return {
			component: CalloutEditor,
			props: {
				parentEditor,
				config,
				mdastNode: this.getMdastNode(),
				lexicalNode: this,
				focusEmitter: this.__focusEmitter
			}
		};
	}
}

export const MdastCalloutVisitor: MdastImportVisitor<MdxJsxFlowElement> = {
	testNode: (node) => node.type === 'mdxJsxFlowElement' && node.name === 'Callout',
	visitNode({ mdastNode, lexicalParent }) {
		(lexicalParent as ElementNode).append(new CalloutNode(mdastNode));
	},
	priority: 10
};

export const LexicalCalloutVisitor: LexicalExportVisitor<CalloutNode, MdxJsxFlowElement> = {
	testLexicalNode: (node): node is CalloutNode => node instanceof CalloutNode,
	visitLexicalNode({ actions, mdastParent, lexicalNode }) {
		actions.appendToParent(mdastParent, lexicalNode.getMdastNode());
	}
};
