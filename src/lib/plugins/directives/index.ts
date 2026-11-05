import type { Component } from 'svelte';
import type { LexicalEditor } from 'lexical';
import type { ContainerDirective, LeafDirective, TextDirective } from 'mdast-util-directive';
import type { MdastEditableNode } from '../core/nestedEditorContext.js';

/** The mdast directive nodes. */
export type Directives = ContainerDirective | LeafDirective | TextDirective;

/** The props passed to a {@link DirectiveDescriptor} `Editor` component. */
export interface DirectiveEditorProps<T extends Directives = Directives> {
	/** The mdast directive node. */
	mdastNode: T;
	/** The parent lexical editor - use this if you are dealing with the Lexical APIs. */
	parentEditor: LexicalEditor;
	/** The Lexical directive node. */
	lexicalNode: MdastEditableNode;
	/** The descriptor that activated the editor. */
	descriptor: DirectiveDescriptor;
}

/** Describes how to recognise and edit a directive. */
export interface DirectiveDescriptor<T extends Directives = Directives> {
	/** Whether the descriptor's Editor should be used for the given node. */
	testNode(node: Directives): boolean;
	/** The name of the descriptor - use this if you're building UI to select a directive. */
	name: string;
	/** The attributes the directive has, used by the generic editor's property form. */
	attributes: string[];
	/** Whether the directive has inner markdown content as children. */
	hasChildren: boolean;
	/** The type of the supported directive. */
	type?: 'leafDirective' | 'containerDirective' | 'textDirective';
	/** The component to use. See {@link DirectiveEditorProps}. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- component props are contravariant
	Editor: Component<DirectiveEditorProps<T>> | Component<any>;
}
