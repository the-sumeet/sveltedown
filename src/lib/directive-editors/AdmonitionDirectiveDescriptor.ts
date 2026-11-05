import type { DirectiveDescriptor } from '../plugins/directives/index.js';
import AdmonitionEditor from './AdmonitionEditor.svelte';

export const ADMONITION_TYPES = ['note', 'tip', 'danger', 'info', 'caution'] as const;
/** @internal */
export type AdmonitionKind = (typeof ADMONITION_TYPES)[number];

/**
 * Pass this descriptor to the `directivesPlugin` `directiveDescriptors` parameter to enable
 * {@link https://docusaurus.io/docs/markdown-features/admonitions | markdown admonitions}.
 * @group Directive
 */
export const AdmonitionDirectiveDescriptor: DirectiveDescriptor = {
	name: 'admonition',
	attributes: [],
	hasChildren: true,
	testNode(node) {
		return ADMONITION_TYPES.includes(node.name as AdmonitionKind);
	},
	Editor: AdmonitionEditor
};
