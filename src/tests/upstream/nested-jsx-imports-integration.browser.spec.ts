// Condensed port of upstream's src/test/nested-jsx-imports-integration.test.tsx.
import { describe, expect, it } from 'vitest';
import {
	AdmonitionDirectiveDescriptor,
	GenericJsxEditor,
	directivesPlugin,
	jsxPlugin,
	tablePlugin,
	type JsxComponentDescriptor
} from '#lib';
import { roundTrip } from '../helpers.js';

const badge: JsxComponentDescriptor = {
	name: 'Badge',
	kind: 'text',
	source: './badge',
	props: [],
	hasChildren: false,
	Editor: GenericJsxEditor
};

const plugins = () => [
	jsxPlugin({ jsxComponentDescriptors: [badge] }),
	directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
	tablePlugin()
];

describe('imports of JSX inside nested editors', () => {
	it('imports a component used in an admonition at the document root', async () => {
		const markdown = await roundTrip(':::note\nA <Badge /> here\n:::', plugins());
		expect(markdown).toContain("import { Badge } from './badge'");
		expect(markdown).toContain(':::note\nA <Badge /> here\n:::');
	});

	it('imports a component used in a table cell', async () => {
		const markdown = await roundTrip('| a | <Badge /> |\n| - | - |\n| c | d |', plugins());
		expect(markdown).toContain("import { Badge } from './badge'");
		expect(markdown).toContain('<Badge />');
	});

	it('keeps one import for a component shared by the root and nested editors', async () => {
		const markdown = await roundTrip(
			"import { Badge } from './badge'\n\nRoot <Badge />\n\n:::note\nNested <Badge />\n:::",
			plugins()
		);
		expect(markdown.match(/import \{ Badge \}/g)).toHaveLength(1);
	});
});
