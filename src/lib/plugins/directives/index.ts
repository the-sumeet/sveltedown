import type { Component } from 'svelte';
import type { LexicalEditor } from 'lexical';
import { directiveFromMarkdown, directiveToMarkdown, type Directives } from 'mdast-util-directive';
import { directive } from 'micromark-extension-directive';
import { map, Signal } from '../../realm/index.js';
import { realmPlugin } from '../../realmPlugin.js';
import {
	addExportVisitor$,
	addImportVisitor$,
	addLexicalNode$,
	addMdastExtension$,
	addSyntaxExtension$,
	addToMarkdownExtension$,
	directiveDescriptors$,
	insertDecoratorNode$
} from '../core/index.js';
import { $createDirectiveNode, DirectiveNode } from './DirectiveNode.js';
import { DirectiveVisitor } from './DirectiveVisitor.js';
import { MdastDirectiveVisitor } from './MdastDirectiveVisitor.js';
export * from './DirectiveNode.js';

export type { Directives };

/** The props passed to a {@link DirectiveDescriptor} `Editor` component. */
export interface DirectiveEditorProps<T extends Directives = Directives> {
	/** The mdast directive node. */
	mdastNode: T;
	/** The parent lexical editor - use this if you are dealing with the Lexical APIs. */
	parentEditor: LexicalEditor;
	/** The Lexical directive node. */
	lexicalNode: DirectiveNode;
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

/**
 * Inserts a new directive node with the published parameters.
 * @group Directive
 */
export const insertDirective$ = Signal<{
	type: Directives['type'];
	name: string;
	attributes?: Directives['attributes'];
}>((r) => {
	r.link(
		r.pipe(
			insertDirective$,
			map((payload) => () => $createDirectiveNode({ children: [], ...payload } as Directives))
		),
		insertDecoratorNode$
	);
});

/**
 * A plugin that adds support for markdown directives.
 * @group Directive
 */
export const directivesPlugin = realmPlugin<{
	/** Your custom directive editors. You can also use the built-in `GenericDirectiveEditor`. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each descriptor edits its own node type
	directiveDescriptors: DirectiveDescriptor<any>[];
	/**
	 * Displays unknown text directives as normal text. This is handy when colons are used to
	 * separate words, e.g. in German "Schüler:in".
	 */
	escapeUnknownTextDirectives?: boolean;
}>({
	update: (realm, params) => {
		realm.pub(directiveDescriptors$, params?.directiveDescriptors ?? []);
	},
	init: (realm, params) => {
		realm.pubIn({
			[directiveDescriptors$]: params?.directiveDescriptors ?? [],
			[addMdastExtension$]: directiveFromMarkdown(),
			[addSyntaxExtension$]: directive(),
			[addImportVisitor$]: MdastDirectiveVisitor(params?.escapeUnknownTextDirectives),
			[addLexicalNode$]: DirectiveNode,
			[addExportVisitor$]: DirectiveVisitor,
			[addToMarkdownExtension$]: directiveToMarkdown()
		});
	}
});
