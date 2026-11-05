// Ported from upstream's src/test/jsx.test.tsx.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxFromMarkdown } from 'mdast-util-mdx';
import { mdxjs } from 'micromark-extension-mdxjs';
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	createEditor,
	ParagraphNode,
	TextNode
} from 'lexical';
import type * as Mdast from 'mdast';
import {
	GenericJsxEditor,
	addNestedEditorChild$,
	importMdastTreeToLexical,
	jsxPlugin,
	realmPlugin,
	type JsxComponentDescriptor,
	type MdastTreeImportOptions
} from '#lib';
import {
	JsxKindMismatchError,
	reconcileJsxKindMismatches
} from '../../lib/plugins/jsx/reconcileJsxKind.js';
import { MdastRootVisitor } from '../../lib/plugins/core/MdastRootVisitor.js';
import { MdastParagraphVisitor } from '../../lib/plugins/core/MdastParagraphVisitor.js';
import { MdastTextVisitor } from '../../lib/plugins/core/MdastTextVisitor.js';
import { $isLexicalJsxNode, LexicalJsxNode } from '../../lib/plugins/jsx/LexicalJsxNode.js';
import { MdastMdxJsxElementVisitor } from '../../lib/plugins/jsx/MdastMdxJsxElementVisitor.js';
import CaptureNestedEditor, { captured } from '../fixtures/CaptureNestedEditor.svelte';
import { renderEditor } from '../helpers.js';
import { expectSoon } from '../dom.js';

afterEach(() => {
	vi.restoreAllMocks();
});

const issue962Markdown =
	'<Card.Header as="h3"><Icon name="video" /> Fotorückblick 2001 + 2002</Card.Header>';
const issue962Descriptors: JsxComponentDescriptor[] = [
	{
		name: 'Card.Header',
		kind: 'flow',
		props: [{ name: 'as', type: 'string' }],
		hasChildren: true,
		Editor: GenericJsxEditor
	},
	{
		name: 'Icon',
		kind: 'text',
		props: [{ name: 'name', type: 'string' }],
		hasChildren: false,
		Editor: GenericJsxEditor
	}
];

const parseMdx = (markdown: string) =>
	fromMarkdown(markdown, { extensions: [mdxjs()], mdastExtensions: [mdxFromMarkdown()] });

const editables = (container: Element) =>
	container.querySelectorAll<HTMLElement>('[contenteditable="true"]');

const blur = (element: HTMLElement) => {
	element.dispatchEvent(new FocusEvent('blur', { relatedTarget: null }));
};

describe('jsx markdown import export', () => {
	it('routes capitalized jsx components sharing an html tag name to the jsx visitor', async () => {
		const { container } = await renderEditor({
			markdown: '<Section>Section content</Section>',
			plugins: [
				jsxPlugin({
					jsxComponentDescriptors: [
						{
							name: 'Section',
							kind: 'text',
							props: [],
							hasChildren: true,
							Editor: GenericJsxEditor
						}
					]
				})
			]
		});
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(container.querySelector('section')).toBeNull();
	});

	it('keeps lowercase html tag names on the html path even with a jsx plugin', async () => {
		const { container } = await renderEditor({
			markdown: '<section>Section content</section>',
			plugins: [jsxPlugin({ jsxComponentDescriptors: [] })]
		});
		await expectSoon(() => container.querySelector('section') !== null);
		expect(container.querySelector('section')).not.toBeNull();
	});

	it('registers nested capitalized JSX children that share an html tag name on export', async () => {
		const { component } = await renderEditor({
			markdown: '<Wrapper><Section /></Wrapper>',
			plugins: [
				jsxPlugin({
					jsxComponentDescriptors: [
						{
							name: 'Wrapper',
							kind: 'text',
							source: './components',
							props: [],
							hasChildren: true,
							Editor: GenericJsxEditor
						},
						{
							name: 'Section',
							kind: 'text',
							source: './components',
							props: [],
							hasChildren: false,
							Editor: GenericJsxEditor
						}
					]
				})
			]
		});
		await expectSoon(() =>
			component.getMarkdown().includes(`import { Wrapper, Section } from './components'`)
		);
		expect(component.getMarkdown()).toContain('<Wrapper>\n  <Section />\n</Wrapper>');
	});

	it('preserves parser semantics by default when a descriptor kind differs from the parsed JSX kind', async () => {
		captured.editor = null;
		const capture = realmPlugin({
			init(realm) {
				realm.pub(addNestedEditorChild$, CaptureNestedEditor);
			}
		});
		const onerror = vi.fn();
		const { container, component } = await renderEditor({
			markdown: issue962Markdown,
			onerror,
			plugins: [capture(), jsxPlugin({ jsxComponentDescriptors: issue962Descriptors })]
		});
		await expectSoon(() => editables(container).length === 2 && captured.editor !== null);
		const nested = editables(container)[1];
		expect(nested.textContent).toContain('Fotorückblick 2001 + 2002');
		captured.editor!.update(
			() => {
				$getRoot()
					.clear()
					.append($createParagraphNode().append($createTextNode('Changed in the nested editor')));
			},
			{ discrete: true }
		);
		blur(nested);
		await expectSoon(
			() =>
				component.getMarkdown() ===
				'<Card.Header as="h3">Changed in the nested editor</Card.Header>'
		);
		expect(onerror).not.toHaveBeenCalled();
	});

	it('preserves a parsed flow JSX kind when the descriptor declares text by default', async () => {
		const onerror = vi.fn();
		const { container, component } = await renderEditor({
			markdown: '<Badge>\ncontent\n</Badge>',
			onerror,
			plugins: [
				jsxPlugin({
					jsxComponentDescriptors: [
						{ name: 'Badge', kind: 'text', props: [], hasChildren: true, Editor: GenericJsxEditor }
					]
				})
			]
		});
		await expectSoon(() => editables(container).length === 2);
		blur(editables(container)[1]);
		await expectSoon(
			() => parseMdx(component.getMarkdown()).children[0]?.type === 'mdxJsxFlowElement'
		);
		expect(onerror).not.toHaveBeenCalled();
	});

	it('does not apply a wildcard JSX policy to elements owned by the HTML visitor', async () => {
		const onerror = vi.fn();
		const { container } = await renderEditor({
			markdown: '<span>text</span>',
			onerror,
			plugins: [
				jsxPlugin({
					jsxComponentDescriptors: [
						{ name: '*', kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor }
					],
					kindMismatchPolicy: 'error'
				})
			]
		});
		await expectSoon(() => container.querySelector('span')?.textContent === 'text');
		expect(onerror).not.toHaveBeenCalled();
	});

	it('applies normalization to direct MDAST tree imports', () => {
		const editor = createEditor({
			namespace: 'jsx-kind-normalization-test',
			nodes: [ParagraphNode, TextNode, LexicalJsxNode],
			onError(error) {
				throw error;
			}
		});
		editor.update(
			() => {
				importMdastTreeToLexical({
					root: $getRoot(),
					mdastRoot: parseMdx(issue962Markdown),
					visitors: [
						MdastRootVisitor,
						MdastParagraphVisitor,
						MdastTextVisitor,
						MdastMdxJsxElementVisitor
					] as unknown as MdastTreeImportOptions['visitors'],
					jsxComponentDescriptors: issue962Descriptors,
					jsxKindMismatchPolicy: 'normalize',
					directiveDescriptors: [],
					codeBlockEditorDescriptors: [],
					defaultCodeBlockLanguage: ''
				});
			},
			{ discrete: true }
		);
		editor.getEditorState().read(() => {
			const jsxNode = $getRoot().getFirstChild();
			if (!$isLexicalJsxNode(jsxNode)) throw new Error('Expected a JSX node');
			expect(jsxNode.getMdastNode().type).toBe('mdxJsxFlowElement');
		});
	});

	it('normalizes a standalone text JSX element to its declared flow kind', async () => {
		const parsed = parseMdx(issue962Markdown);
		const normalized = reconcileJsxKindMismatches(parsed, issue962Descriptors, 'normalize');
		const card = normalized.children[0];
		expect(parsed.children[0].type).toBe('paragraph');
		if (card.type !== 'mdxJsxFlowElement') throw new Error('Expected a flow JSX element');
		expect(card.children).toHaveLength(1);
		expect(card.children[0]).toMatchObject({
			type: 'paragraph',
			children: [
				{ type: 'mdxJsxTextElement', name: 'Icon' },
				{ type: 'text', value: ' Fotorückblick 2001 + 2002' }
			]
		});
		expect(reconcileJsxKindMismatches(normalized, issue962Descriptors, 'normalize')).toEqual(
			normalized
		);
		const formatted = reconcileJsxKindMismatches(
			parseMdx('<Card.Header>*emphasis* and `code`</Card.Header>'),
			issue962Descriptors,
			'normalize'
		);
		expect(formatted.children[0]).toMatchObject({
			type: 'mdxJsxFlowElement',
			children: [
				{
					type: 'paragraph',
					children: [
						{ type: 'emphasis' },
						{ type: 'text', value: ' and ' },
						{ type: 'inlineCode', value: 'code' }
					]
				}
			]
		});

		const onerror = vi.fn();
		const { container, component } = await renderEditor({
			markdown: issue962Markdown,
			onerror,
			plugins: [
				jsxPlugin({ jsxComponentDescriptors: issue962Descriptors, kindMismatchPolicy: 'normalize' })
			]
		});
		await expectSoon(() => editables(container).length === 2);
		blur(editables(container)[1]);
		await expectSoon(() => {
			const exported = component.getMarkdown();
			return (
				parseMdx(exported).children[0]?.type === 'mdxJsxFlowElement' &&
				exported.includes('Fotorückblick 2001 + 2002')
			);
		});
		expect(onerror).not.toHaveBeenCalled();
	});

	it('normalizes one flow paragraph to a declared text JSX kind', async () => {
		const descriptors: JsxComponentDescriptor[] = [
			{ name: 'Badge', kind: 'text', props: [], hasChildren: true, Editor: GenericJsxEditor }
		];
		const markdown = '<Badge>\ncontent\n</Badge>';
		expect(
			reconcileJsxKindMismatches(parseMdx(markdown), descriptors, 'normalize').children[0]
		).toMatchObject({
			type: 'paragraph',
			children: [
				{ type: 'mdxJsxTextElement', name: 'Badge', children: [{ type: 'text', value: 'content' }] }
			]
		});
		const onerror = vi.fn();
		const { container, component } = await renderEditor({
			markdown,
			onerror,
			plugins: [
				jsxPlugin({ jsxComponentDescriptors: descriptors, kindMismatchPolicy: 'normalize' })
			]
		});
		await expectSoon(() => editables(container).length === 2);
		blur(editables(container)[1]);
		await expectSoon(() => {
			const first = parseMdx(component.getMarkdown()).children[0];
			return (
				first?.type === 'paragraph' &&
				(first.children[0] as { name?: string } | undefined)?.name === 'Badge'
			);
		});
		expect(onerror).not.toHaveBeenCalled();
	});

	it('normalizes an empty flow JSX element to text without data loss', () => {
		const descriptors: JsxComponentDescriptor[] = [
			{ name: 'Badge', kind: 'text', props: [], hasChildren: true, Editor: GenericJsxEditor }
		];
		expect(
			reconcileJsxKindMismatches(parseMdx('<Badge />'), descriptors, 'normalize').children[0]
		).toMatchObject({
			type: 'paragraph',
			children: [{ type: 'mdxJsxTextElement', name: 'Badge', children: [] }]
		});
	});

	it.each([
		{
			name: 'a block descriptor inside a heading',
			markdown: '# <Block>content</Block>',
			descriptors: [
				{ name: 'Block', kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor }
			]
		},
		{
			name: 'a text descriptor containing a non-paragraph block',
			markdown: '<Inline>\n# Heading\n</Inline>',
			descriptors: [
				{ name: 'Inline', kind: 'text', props: [], hasChildren: true, Editor: GenericJsxEditor }
			]
		}
	])('rejects normalization for $name', ({ markdown, descriptors }) => {
		expect(() =>
			reconcileJsxKindMismatches(
				parseMdx(markdown),
				descriptors as JsxComponentDescriptor[],
				'normalize'
			)
		).toThrowError(JsxKindMismatchError);
	});

	it('rejects a mismatch under an MDAST parent with an unknown content model', () => {
		const jsxNode = (parseMdx('<Block>content</Block>').children[0] as Mdast.Paragraph).children[0];
		const tree = {
			type: 'root',
			children: [{ type: 'customParent', children: [jsxNode] }]
		} as unknown as Mdast.Root;
		const descriptors: JsxComponentDescriptor[] = [
			{ name: 'Block', kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor }
		];
		expect(() => reconcileJsxKindMismatches(tree, descriptors, 'normalize')).toThrowError(
			'customParent parent does not declare whether its children are flow or phrasing content'
		);
	});

	it('applies an updated mismatch policy to later Markdown imports', async () => {
		const { container, component, rerender } = await renderEditor({
			markdown: '',
			plugins: [
				jsxPlugin({ jsxComponentDescriptors: issue962Descriptors, kindMismatchPolicy: 'source' })
			]
		});
		await rerender({
			plugins: [
				jsxPlugin({ jsxComponentDescriptors: issue962Descriptors, kindMismatchPolicy: 'normalize' })
			]
		});
		await new Promise((resolve) => setTimeout(resolve, 0));
		component.setMarkdown(issue962Markdown);
		await expectSoon(() => editables(container).length === 2);
		blur(editables(container)[1]);
		await expectSoon(
			() => parseMdx(component.getMarkdown()).children[0]?.type === 'mdxJsxFlowElement'
		);
		expect(parseMdx(component.getMarkdown()).children[0]?.type).toBe('mdxJsxFlowElement');
	});

	it.each([
		{
			name: 'a block descriptor embedded in surrounding phrasing',
			markdown: 'Before <Block>content</Block> after',
			descriptors: [
				{ name: 'Block', kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor }
			]
		},
		{
			name: 'a text descriptor with multiple flow blocks',
			markdown: '<Inline>\nfirst\n\nsecond\n</Inline>',
			descriptors: [
				{ name: 'Inline', kind: 'text', props: [], hasChildren: true, Editor: GenericJsxEditor }
			]
		}
	])('reports an actionable normalization error for $name', async ({ markdown, descriptors }) => {
		const onerror = vi.fn();
		const { component } = await renderEditor({
			markdown,
			onerror,
			plugins: [
				jsxPlugin({
					jsxComponentDescriptors: descriptors as JsxComponentDescriptor[],
					kindMismatchPolicy: 'normalize'
				})
			]
		});
		await expectSoon(() => onerror.mock.calls.length === 1);
		expect(onerror.mock.calls[0][0]).toMatchObject({ source: markdown });
		expect(onerror.mock.calls[0][0].error).toContain('kindMismatchPolicy: "normalize"');
		expect(component.getMarkdown()).toBe(markdown);
	});

	it('rejects named, fragment, and wildcard descriptor mismatches in strict mode', async () => {
		const named: JsxComponentDescriptor[] = [
			{ name: 'Block', kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor }
		];
		const wildcard: JsxComponentDescriptor[] = [
			{ name: '*', kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor }
		];
		const fragment: JsxComponentDescriptor[] = [
			{ name: null, kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor }
		];
		expect(() =>
			reconcileJsxKindMismatches(parseMdx('<Block>content</Block>'), named, 'error')
		).toThrowError(JsxKindMismatchError);
		expect(() =>
			reconcileJsxKindMismatches(parseMdx('<>content</>'), fragment, 'error')
		).toThrowError(JsxKindMismatchError);
		expect(() =>
			reconcileJsxKindMismatches(parseMdx('<Unknown>content</Unknown>'), wildcard, 'error')
		).toThrowError(JsxKindMismatchError);
		expect(() =>
			reconcileJsxKindMismatches(parseMdx('<Block>\ncontent\n</Block>'), named, 'error')
		).not.toThrow();
		const onerror = vi.fn();
		await renderEditor({
			markdown: '<Block>content</Block>',
			onerror,
			plugins: [jsxPlugin({ jsxComponentDescriptors: named, kindMismatchPolicy: 'error' })]
		});
		await expectSoon(() => onerror.mock.calls.length === 1);
		expect(onerror.mock.calls[0][0].error).toContain('kindMismatchPolicy: "error"');
	});
});
