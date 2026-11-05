import type { Component } from 'svelte';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

/** The mdast JSX nodes. */
export type MdastJsx = MdxJsxTextElement | MdxJsxFlowElement;

/** Describes a property of a JSX component. */
export interface JsxPropertyDescriptor {
	/** The name of the property. */
	name: string;
	/** The type of the property. */
	type: 'string' | 'number' | 'expression';
	/** Whether the property is required. */
	required?: boolean;
}

/** The props passed to a {@link JsxComponentDescriptor} `Editor` component. */
export interface JsxEditorProps {
	/** The MDAST node to edit. */
	mdastNode: MdastJsx;
	/** The descriptor that activated the editor. */
	descriptor: JsxComponentDescriptor;
}

/** Describes how to edit a JSX component. */
export interface JsxComponentDescriptor {
	/** The tag name, or `*` for any tag. For fragments, use null. */
	name: string | null;
	/** Whether the component is a flow or text component (block or inline). */
	kind: 'flow' | 'text';
	/** The module to import the component from. Omit to skip the import statement. */
	source?: string;
	/** Whether the component is the default export of the module. */
	defaultExport?: boolean;
	/** The properties that can be applied to the component. */
	props: JsxPropertyDescriptor[];
	/** Whether or not the component has children. */
	hasChildren?: boolean;
	/** The component that edits the node. */
	Editor: Component<JsxEditorProps>;
}
