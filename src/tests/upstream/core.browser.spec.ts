// Ported from upstream's src/test/core.test.tsx: the cases that need plugins or Lexical directly.
// The plugin-free round trips are in src/tests/core.svelte.spec.ts.
import { describe, expect, it, test, vi } from 'vitest';
import { $getRoot, createEditor, ParagraphNode, TextNode } from 'lexical';
import { QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import type * as Mdast from 'mdast';
import {
	CodeBlockNode,
	IS_ITALIC,
	IS_UNDERLINE,
	codeBlockPlugin,
	codeMirrorPlugin,
	exportMarkdownFromLexical,
	importMarkdownToLexical,
	linkPlugin,
	thematicBreakPlugin,
	type ExportMarkdownFromLexicalOptions,
	type MarkdownParseOptions,
	type MdastImportVisitor
} from '#lib';
import { MdastRootVisitor } from '../../lib/plugins/core/MdastRootVisitor.js';
import { MdastParagraphVisitor } from '../../lib/plugins/core/MdastParagraphVisitor.js';
import { MdastTextVisitor } from '../../lib/plugins/core/MdastTextVisitor.js';
import { MdastBreakVisitor } from '../../lib/plugins/core/MdastBreakVisitor.js';
import { LexicalRootVisitor } from '../../lib/plugins/core/LexicalRootVisitor.js';
import { LexicalParagraphVisitor } from '../../lib/plugins/core/LexicalParagraphVisitor.js';
import { LexicalTextVisitor } from '../../lib/plugins/core/LexicalTextVisitor.js';
import { LexicalLinebreakVisitor } from '../../lib/plugins/core/LexicalLinebreakVisitor.js';
import { MdastBlockQuoteVisitor } from '../../lib/plugins/quote/MdastBlockQuoteVisitor.js';
import { LexicalQuoteVisitor } from '../../lib/plugins/quote/LexicalQuoteVisitor.js';
import { LexicalListItemVisitor } from '../../lib/plugins/lists/LexicalListItemVisitor.js';
import { LexicalListVisitor } from '../../lib/plugins/lists/LexicalListVisitor.js';
import { MdastListItemVisitor } from '../../lib/plugins/lists/MdastListItemVisitor.js';
import { MdastListVisitor } from '../../lib/plugins/lists/MdastListVisitor.js';
import { MdastCodeVisitor } from '../../lib/plugins/codeblock/MdastCodeVisitor.js';
import { CodeBlockVisitor } from '../../lib/plugins/codeblock/CodeBlockVisitor.js';
import { MdastLinkVisitor } from '../../lib/plugins/link/MdastLinkVisitor.js';
import { renderEditor, roundTrip } from '../helpers.js';

const descriptors = {
	jsxComponentDescriptors: [],
	directiveDescriptors: [],
	defaultCodeBlockLanguage: ''
};

describe('markdown import export', () => {
	it('preserves empty lines inside blockquotes across lexical markdown round-trips', () => {
		const editor = createEditor({
			namespace: 'test-editor',
			nodes: [ParagraphNode, TextNode, QuoteNode],
			onError(error) {
				throw error;
			}
		});
		let exported = '';
		editor.update(() => {
			importMarkdownToLexical({
				root: $getRoot(),
				markdown: '> one\n> two\n>\n> three',
				visitors: [
					MdastRootVisitor,
					MdastParagraphVisitor,
					MdastTextVisitor,
					MdastBreakVisitor,
					MdastBlockQuoteVisitor
				] as unknown as MarkdownParseOptions['visitors'],
				syntaxExtensions: [],
				mdastExtensions: [],
				codeBlockEditorDescriptors: [],
				...descriptors
			});
			exported = exportMarkdownFromLexical({
				root: $getRoot(),
				visitors: [
					LexicalRootVisitor,
					LexicalParagraphVisitor,
					LexicalTextVisitor,
					LexicalLinebreakVisitor,
					LexicalQuoteVisitor
				] as unknown as ExportMarkdownFromLexicalOptions['visitors'],
				toMarkdownExtensions: [],
				toMarkdownOptions: {},
				jsxComponentDescriptors: [],
				jsxIsAvailable: false
			}).trim();
		});
		expect(exported).toEqual('> one\n> two\n>\n> three');
	});

	it.each([
		['**[a](https://x.com)**', '[**a**](https://x.com)'],
		['~~[a](https://x.com)~~', '[~~a~~](https://x.com)'],
		['<u>[a](https://x.com)</u>', '[<u>a</u>](https://x.com)']
	])('keeps the surrounding formatting of text inside links: %s', async (markdown, expected) => {
		expect(await roundTrip(markdown, [linkPlugin()])).toEqual(expected);
	});

	it('keeps formatting that a custom import visitor assigns to a child node', () => {
		const UnderlineLinksInEmphasisVisitor: MdastImportVisitor<Mdast.Emphasis> = {
			testNode: 'emphasis',
			visitNode({ mdastNode, actions, lexicalParent }) {
				actions.addFormatting(IS_ITALIC);
				mdastNode.children.forEach((child) => {
					if (child.type === 'link') actions.addFormatting(IS_UNDERLINE, child);
				});
				actions.visitChildren(mdastNode, lexicalParent);
			}
		};
		const editor = createEditor({
			namespace: 'test-editor',
			nodes: [ParagraphNode, TextNode, LinkNode],
			onError(error) {
				throw error;
			}
		});
		let format = 0;
		editor.update(() => {
			importMarkdownToLexical({
				root: $getRoot(),
				markdown: '*[a](https://x.com)*',
				visitors: [
					MdastRootVisitor,
					MdastParagraphVisitor,
					MdastTextVisitor,
					MdastLinkVisitor,
					UnderlineLinksInEmphasisVisitor
				] as unknown as MarkdownParseOptions['visitors'],
				syntaxExtensions: [],
				mdastExtensions: [],
				codeBlockEditorDescriptors: [],
				...descriptors
			});
			format = $getRoot().getAllTextNodes()[0].getFormat();
		});
		expect(format).toBe(IS_UNDERLINE);
	});

	it('preserves fenced code block metadata when CodeMirror handles a configured language', async () => {
		const markdown =
			'```tsx live react\nexport default function App() {\n  return <h1>Hello world</h1>\n}\n```';
		expect(
			await roundTrip(markdown, [
				codeBlockPlugin(),
				codeMirrorPlugin({ codeBlockLanguages: { tsx: 'TypeScript (React)' } })
			])
		).toEqual(markdown);
	});

	it('falls back to the default code block language for unsupported languages with metadata', async () => {
		const onerror = vi.fn();
		const markdown = 'Before fence.\n\n```unsupported live\nsome content\n```\n\nAfter fence.';
		const { component } = await renderEditor({
			markdown,
			onerror,
			plugins: [
				codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
				codeMirrorPlugin({ codeBlockLanguages: { txt: 'Plain text' } })
			]
		});
		expect(onerror).not.toHaveBeenCalled();
		await vi.waitFor(() => expect(component.getContentEditableHTML()).toContain('some content'));
		expect(component.getContentEditableHTML()).toContain('After fence.');
		expect(component.getMarkdown().trim()).toEqual(markdown);
	});

	it('imports valid and malformed code block JSON without leaking invalid custom fields', () => {
		const editor = createEditor({
			namespace: 'code-block-json-test',
			nodes: [CodeBlockNode],
			onError(error) {
				throw error;
			}
		});
		editor.update(
			() => {
				const nodes = [
					CodeBlockNode.importJSON({
						type: 'codeblock',
						version: 1,
						code: 'const valid = true',
						language: 'ts',
						meta: 'live'
					}),
					CodeBlockNode.importJSON({ type: 'codeblock', version: 1 }),
					CodeBlockNode.importJSON({
						type: 'codeblock',
						version: 1,
						code: 42,
						language: null,
						meta: false
					})
				];
				expect(nodes.map((node) => node.exportJSON())).toEqual([
					{
						type: 'codeblock',
						version: 1,
						code: 'const valid = true',
						language: 'ts',
						meta: 'live'
					},
					{ type: 'codeblock', version: 1, code: '', language: '', meta: '' },
					{ type: 'codeblock', version: 1, code: '', language: '', meta: '' }
				]);
			},
			{ discrete: true }
		);
	});

	it('round-trips thematic breaks', async () => {
		expect(await roundTrip('Before\n\n***\n\nAfter', [thematicBreakPlugin()])).toEqual(
			'Before\n\n***\n\nAfter'
		);
	});
});

describe('List parsing and serialization', () => {
	const parseAndExport = (markdown: string) => {
		const editor = createEditor({
			namespace: 'test-editor',
			nodes: [ParagraphNode, TextNode, ListItemNode, ListNode, CodeBlockNode],
			onError(error) {
				throw error;
			}
		});
		let exported = '';
		editor.update(() => {
			importMarkdownToLexical({
				root: $getRoot(),
				markdown,
				visitors: [
					MdastRootVisitor,
					MdastParagraphVisitor,
					MdastTextVisitor,
					MdastBreakVisitor,
					MdastListVisitor,
					MdastListItemVisitor,
					MdastCodeVisitor
				] as unknown as MarkdownParseOptions['visitors'],
				syntaxExtensions: [],
				mdastExtensions: [],
				codeBlockEditorDescriptors: [
					{ match: () => true, priority: 0, Editor: (() => null) as never }
				],
				...descriptors
			});
			exported = exportMarkdownFromLexical({
				root: $getRoot(),
				visitors: [
					LexicalRootVisitor,
					LexicalParagraphVisitor,
					LexicalTextVisitor,
					LexicalLinebreakVisitor,
					LexicalListVisitor,
					LexicalListItemVisitor,
					CodeBlockVisitor
				] as unknown as ExportMarkdownFromLexicalOptions['visitors'],
				toMarkdownExtensions: [],
				toMarkdownOptions: {},
				jsxComponentDescriptors: [],
				jsxIsAvailable: false
			}).trim();
		});
		return exported;
	};

	test('preserves empty lines inside unordered lists', () => {
		const markdown =
			"* This is the first list item.\n* Here's the second list item.\n\n  I need to add another paragraph below the second list item.\n\n  And another one.\n* And here's the third list item.";
		expect(parseAndExport(markdown)).toEqual(markdown);
	});

	test('preserves empty lines inside ordered lists', () => {
		const markdown =
			"1. This is the first list item.\n2. Here's the second list item.\n\n   I need to add another paragraph below the second list item.\n\n   And another one.\n3. And here's the third list item.";
		expect(parseAndExport(markdown)).toEqual(markdown);
	});

	test('does not insert extra blank lines before paragraphs that follow list item code blocks', () => {
		const markdown =
			"* This is the first list item.\n* Here's the second list item.\n  ```txt\n  code\n  ```\n  I need to add another paragraph below the code block.\n* And here's the third list item.";
		expect(parseAndExport(markdown)).toEqual(markdown);
	});
});
