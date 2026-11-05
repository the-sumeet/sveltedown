<!-- @component A universal editor for any JSX element: its content and its properties. -->
<script lang="ts" module>
	import type { Component } from 'svelte';
	import type { JsxEditorProps } from '../plugins/jsx/index.js';

	/** Props of the generic JSX editor. */
	export interface GenericJsxEditorProps extends JsxEditorProps {
		/** A custom component to edit the properties with. */
		PropertyEditor?: Component<{
			properties: Record<string, string>;
			title: string;
			onChange: (values: Record<string, string>) => void;
		}>;
	}
</script>

<script lang="ts">
	import type { RootContent } from 'mdast';
	import type {
		MdxJsxAttribute,
		MdxJsxAttributeValueExpression,
		MdxJsxExpressionAttribute,
		MdxJsxFlowElement,
		MdxJsxTextElement
	} from 'mdast-util-mdx-jsx';
	import { useMdastNodeUpdater } from '../plugins/core/nestedEditorContext.js';
	import NestedLexicalEditor from '../plugins/core/NestedLexicalEditor.svelte';
	import PropertyPopover from '../plugins/core/PropertyPopover.svelte';
	import type { MdastJsx } from '../plugins/jsx/index.js';

	let { mdastNode, descriptor, PropertyEditor }: GenericJsxEditorProps = $props();

	const updateMdastNode = useMdastNodeUpdater<MdastJsx>();

	const isExpressionValue = (
		value: string | MdxJsxAttributeValueExpression | null | undefined
	): value is MdxJsxAttributeValueExpression =>
		value !== null &&
		typeof value === 'object' &&
		'type' in value &&
		'value' in value &&
		typeof value.value === 'string';

	const isMdxJsxAttribute = (
		value: MdxJsxAttribute | MdxJsxExpressionAttribute
	): value is MdxJsxAttribute => value.type === 'mdxJsxAttribute' && typeof value.name === 'string';

	const properties = $derived.by(() => {
		const result: Record<string, string> = {};
		for (const { name } of descriptor.props) {
			const attribute = mdastNode.attributes.find((attr) =>
				isMdxJsxAttribute(attr) ? attr.name === name : false
			);
			if (attribute && isExpressionValue(attribute.value)) result[name] = attribute.value.value;
			else if (attribute && typeof attribute.value === 'string') result[name] = attribute.value;
			else result[name] = '';
		}
		return result;
	});

	function onChange(values: Record<string, string>) {
		const attributes: MdastJsx['attributes'] = [];
		for (const [name, value] of Object.entries(values)) {
			if (value === '') continue;
			const property = descriptor.props.find((prop) => prop.name === name);
			attributes.push({
				type: 'mdxJsxAttribute',
				name,
				value:
					property?.type === 'expression'
						? { type: 'mdxJsxAttributeValueExpression', value }
						: value
			});
		}
		updateMdastNode({ attributes });
	}

	const Properties = $derived(PropertyEditor ?? PropertyPopover);
	const showName = $derived(
		descriptor.props.length === 0 && descriptor.hasChildren && descriptor.kind === 'flow'
	);
</script>

<div class={descriptor.kind === 'text' ? 'sd-inline-editor' : 'sd-block-editor'}>
	{#if showName}
		<span class="sd-generic-component-name">{mdastNode.name ?? 'Fragment'}</span>
	{/if}

	{#if descriptor.props.length > 0}
		<Properties {properties} title={mdastNode.name ?? ''} {onChange} />
	{/if}

	{#if descriptor.hasChildren}
		<NestedLexicalEditor
			block={mdastNode.type === 'mdxJsxFlowElement'}
			getContent={(node: MdxJsxTextElement | MdxJsxFlowElement) => node.children as RootContent[]}
			getUpdatedMdastNode={(node: MdxJsxTextElement | MdxJsxFlowElement, children: RootContent[]) =>
				({ ...node, children }) as MdxJsxTextElement | MdxJsxFlowElement}
		/>
	{:else}
		<span class="sd-generic-component-name">{mdastNode.name}</span>
	{/if}
</div>
