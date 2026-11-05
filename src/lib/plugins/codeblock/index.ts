import type { Component } from 'svelte';
import { Signal, map, withLatestFrom } from '../../realm/index.js';
import { realmPlugin } from '../../realmPlugin.js';
import type { VoidEmitter } from '../../utils/voidEmitter.js';
import {
	Appender,
	addActivePlugin$,
	addExportVisitor$,
	addImportVisitor$,
	addLexicalNode$,
	codeBlockEditorDescriptors$,
	defaultCodeBlockLanguage$,
	insertDecoratorNode$
} from '../core/index.js';
import {
	$createCodeBlockNode,
	CodeBlockNode,
	type CreateCodeBlockNodeOptions
} from './CodeBlockNode.js';
import { CodeBlockVisitor } from './CodeBlockVisitor.js';
import { MdastCodeVisitor } from './MdastCodeVisitor.js';
export * from './CodeBlockNode.js';
export * from './codeBlockEditorContext.js';

export { defaultCodeBlockLanguage$ };

/** The props passed to a {@link CodeBlockEditorDescriptor} `Editor` component. */
export interface CodeBlockEditorProps {
	/** The code to edit. */
	code: string;
	/** The language of the fenced code block. */
	language: string;
	/** The meta of the fenced code block. */
	meta: string;
	/** The key of the Lexical node - use this if you are dealing with the Lexical APIs. */
	nodeKey: string;
	/**
	 * An emitter that will execute its subscription when the editor should be focused.
	 * You don't need to unsubscribe: the emitter has a single subscription model.
	 */
	focusEmitter: VoidEmitter;
}

/**
 * Implement this interface to create a custom code block editor.
 * Pass the object in the {@link codeBlockPlugin} parameters.
 * @group Code Block
 */
export interface CodeBlockEditorDescriptor {
	/** Higher wins, which allows a catch-all editor alongside language-specific ones. */
	priority: number;
	/** Returns true if the descriptor's editor should be used for the given code block. */
	match: (language: string | null | undefined, meta: string | null | undefined) => boolean;
	/** The component to use. See {@link CodeBlockEditorProps}. */
	Editor: Component<CodeBlockEditorProps>;
}

/**
 * A signal that inserts a new code block into the editor with the published options.
 * @group Code Block
 */
export const insertCodeBlock$ = Signal<Partial<CreateCodeBlockNodeOptions>>((r) => {
	r.link(
		r.pipe(
			insertCodeBlock$,
			withLatestFrom(defaultCodeBlockLanguage$),
			map(
				([payload, defaultCodeBlockLanguage]) =>
					() =>
						$createCodeBlockNode({ language: defaultCodeBlockLanguage, ...payload })
			)
		),
		insertDecoratorNode$
	);
});

/**
 * A signal that appends a code block editor descriptor to the list of descriptors.
 * @group Code Block
 */
export const appendCodeBlockEditorDescriptor$ = Appender(codeBlockEditorDescriptors$);

/**
 * A plugin that adds support for code blocks and custom code block editors.
 * @group Code Block
 */
export const codeBlockPlugin = realmPlugin<{
	/**
	 * Pass an array of {@link CodeBlockEditorDescriptor} to register custom code block editors.
	 */
	codeBlockEditorDescriptors?: CodeBlockEditorDescriptor[];
	/**
	 * The default code block language. Used when inserting a new code block, and as a fallback at import time for
	 * fences whose language has no matching descriptor.
	 */
	defaultCodeBlockLanguage?: string;
}>({
	update(realm, params) {
		realm.pub(defaultCodeBlockLanguage$, params?.defaultCodeBlockLanguage ?? '');
	},

	init(realm, params) {
		realm.pubIn({
			[addActivePlugin$]: 'codeblock',
			[defaultCodeBlockLanguage$]: params?.defaultCodeBlockLanguage ?? '',
			[codeBlockEditorDescriptors$]: params?.codeBlockEditorDescriptors ?? [],
			[addImportVisitor$]: MdastCodeVisitor,
			[addLexicalNode$]: CodeBlockNode,
			[addExportVisitor$]: CodeBlockVisitor
		});
	}
});
