// Ported from upstream's src/test/impex.test.tsx, plus lists.test.tsx and linked-image.test.tsx.
import { describe, expect, it } from 'vitest';
import type * as Mdast from 'mdast';
import { $createListItemNode, $createListNode } from '@lexical/list';
import { $createTextNode, $getRoot } from 'lexical';
import { fromMarkdown } from 'mdast-util-from-markdown';
import {
	codeBlockPlugin,
	codeMirrorPlugin,
	frontmatterPlugin,
	headingsPlugin,
	imagePlugin,
	linkPlugin,
	listsPlugin,
	quotePlugin,
	thematicBreakPlugin
} from '#lib';
import { renderEditor, roundTrip } from '../helpers.js';

const all = () => [
	headingsPlugin(),
	listsPlugin(),
	quotePlugin(),
	linkPlugin(),
	imagePlugin(),
	thematicBreakPlugin(),
	frontmatterPlugin(),
	codeBlockPlugin(),
	codeMirrorPlugin({ codeBlockLanguages: { js: 'JavaScript', '': 'Plain' } })
];

async function testIdenticalMarkdown(markdown: string) {
	expect(await roundTrip(markdown, all())).toEqual(markdown.trim());
}

describe('markdown import export', () => {
	it('works with an empty string', () => testIdenticalMarkdown(''));
	it('works with a simple paragraph', () => testIdenticalMarkdown('Hello World\n'));
	it('works with a line break', () => testIdenticalMarkdown('Hello\nWorld'));
	it('works with two paragraphs', () => testIdenticalMarkdown('Hello\n\nWorld'));
	it('works with italics', () => testIdenticalMarkdown('*Hello* World'));
	it('works with strong', () => testIdenticalMarkdown('**Hello** World'));
	it('works with underline', () => testIdenticalMarkdown('<u>Hello</u> World'));
	it('works with nested crazy formatting', () =>
		testIdenticalMarkdown('*Hello **world** some more*\n\n**Hello *world*<u>some</u> more**'));
	it('supports inline code', () => testIdenticalMarkdown('Hello `const` World'));
	it('supports links', () => testIdenticalMarkdown('[Virtuoso](https://virtuoso.dev/) World'));
	it('supports headings', () => testIdenticalMarkdown('# Hello\n\n## World'));
	it('supports markdown nested formatting', () =>
		testIdenticalMarkdown(
			'* Hello <u>World</u> **bold**\n* World\n  * Nested\n  * Unordered list\n\n1. Point 1\n2. Point 2'
		));
	it('supports markdown blockquotes', () =>
		testIdenticalMarkdown('Hello!\n\n> Hello *bold* World\n> Virtuoso\n\nLine'));
	// Upstream lists this case as a todo; the code block plugins make it pass.
	it('supports code blocks', () =>
		testIdenticalMarkdown("Hello Js!\n\n```\nconst hello = 'world'\n```"));
	it('supports horizontal rules (thematic breaks)', () =>
		testIdenticalMarkdown(
			'Try to put a blank line before...\n\n***\n\n...and after a horizontal rule.'
		));
	it('supports images', () =>
		testIdenticalMarkdown(
			'![The San Juan Mountains are beautiful!](/assets/images/san-juan-mountains.jpg "San Juan Mountains")'
		));
	it('supports frontmatter', () =>
		testIdenticalMarkdown(
			'---\nid: my-favorite-page\ntitle: My Favorite page\n---\n\n# Hello world'
		));
	it('accepts bullet configuration', async () => {
		const { component } = await renderEditor({
			markdown: '- Bullet 1\n- Bullet 2',
			plugins: [listsPlugin()],
			toMarkdownOptions: { bullet: '-', listItemIndent: 'one' }
		});
		expect(component.getMarkdown().trim()).toEqual('- Bullet 1\n- Bullet 2');
	});
});

describe('linked images', () => {
	const plugins = () => [linkPlugin(), imagePlugin()];
	it('round-trips an image wrapped in a link', async () => {
		const markdown = '[![alt text](https://example.com/img.png "the title")](https://example.com)';
		expect(await roundTrip(markdown, plugins())).toEqual(markdown);
	});
	it('round-trips a plain image', async () => {
		const markdown = '![alt text](https://example.com/img.png)';
		expect(await roundTrip(markdown, plugins())).toEqual(markdown);
	});
});

function tree(markdown: string) {
	return JSON.parse(
		JSON.stringify(fromMarkdown(markdown), (key, value: unknown) =>
			key === 'position' ? undefined : value
		)
	) as Mdast.Root;
}

describe('ordered list start (#471)', () => {
	const listRoundTrip = (markdown: string) => roundTrip(markdown, [listsPlugin()]);

	async function expectStableNestedList(markdown: string, start: number) {
		const once = await listRoundTrip(markdown);
		const twice = await listRoundTrip(once);
		expect(tree(twice)).toEqual(tree(once));
		const outer = tree(once).children[0] as Mdast.List;
		expect(outer.children).toHaveLength(1);
		const nested = outer.children[0].children[1] as Mdast.List;
		expect(nested.type).toBe('list');
		expect(nested.start).toBe(start);
		expect(nested.children).toHaveLength(2);
	}

	it('keeps a start number above one', async () =>
		expect(await listRoundTrip('3. three\n4. four')).toBe('3. three\n4. four'));
	it('keeps a start number of zero', async () =>
		expect(await listRoundTrip('0. zero\n1. one')).toBe('0. zero\n1. one'));
	it('keeps a large start number', async () => expect(await listRoundTrip('42. x')).toBe('42. x'));
	it('keeps the start number of a nested ordered list', () =>
		expectStableNestedList('1. a\n\n   5. b\n   6. c', 5));
	it('keeps a nested ordered list that starts at zero', () =>
		expectStableNestedList('1. a\n\n   0. b\n   1. c', 0));
	it('keeps a nested ordered list that starts at one', () =>
		expectStableNestedList('1. a\n   1. b\n   2. c', 1));
	it('keeps lists that start at one unchanged', async () =>
		expect(await listRoundTrip('1. one\n2. two')).toBe('1. one\n2. two'));
	it('does not number bullet lists', async () =>
		expect(await listRoundTrip('* a\n* b')).toBe('* a\n* b'));
	it('does not number check lists', async () =>
		expect(await listRoundTrip('* [ ] a')).toBe('* [ ] a'));

	it('exports the start number of a list created in the editor', async () => {
		const { component, rootEditor } = await renderEditor({
			markdown: '',
			plugins: [listsPlugin()]
		});
		rootEditor.update(
			() => {
				const list = $createListNode('number', 7);
				const item = $createListItemNode();
				item.append($createTextNode('x'));
				list.append(item);
				$getRoot().clear().append(list);
			},
			{ discrete: true }
		);
		expect(component.getMarkdown().trim()).toBe('7. x');
	});
});
