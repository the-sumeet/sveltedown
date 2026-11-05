import type { Component } from 'svelte';
import type { VoidEmitter } from '../../utils/voidEmitter.js';

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

/** Selects the editor component for matching code blocks. */
export interface CodeBlockEditorDescriptor {
	/** Higher wins, which allows a catch-all editor alongside language-specific ones. */
	priority: number;
	/** Returns true if the descriptor's editor should be used for the given code block. */
	match: (language: string | null | undefined, meta: string | null | undefined) => boolean;
	/** The component to use. See {@link CodeBlockEditorProps}. */
	Editor: Component<CodeBlockEditorProps>;
}
