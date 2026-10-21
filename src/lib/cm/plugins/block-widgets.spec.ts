import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { createRawSnippet } from 'svelte';
import { buildBlockDecorations, widgetSnippets, type WidgetSnippets } from './block-widgets.js';
import { SvelteWidget } from '../utils/svelte-widget.svelte.js';
import ImageWidget from '../../components/widgets/ImageWidget.svelte';
import CheckboxWidget from '../../components/widgets/CheckboxWidget.svelte';
import CodeBlockWidget from '../../components/widgets/CodeBlockWidget.svelte';
import SnippetHost from '../../components/widgets/SnippetHost.svelte';

function build(doc: string, cursor: number, snippets: WidgetSnippets = {}) {
	const state = EditorState.create({
		doc,
		selection: { anchor: cursor },
		extensions: [markdown({ base: markdownLanguage }), widgetSnippets.of(snippets)]
	});
	ensureSyntaxTree(state, doc.length);
	const widgets: { from: number; to: number; widget: SvelteWidget | string }[] = [];
	const lines: string[] = [];
	buildBlockDecorations(state).between(0, doc.length, (from, to, value) => {
		const widget = value.spec.widget;
		if (widget instanceof SvelteWidget) widgets.push({ from, to, widget });
		else if (widget) widgets.push({ from, to, widget: widget.constructor.name });
		else lines.push(String(value.spec.class));
	});
	return { widgets, lines };
}

describe('buildBlockDecorations', () => {
	describe('images', () => {
		const doc = 'x\n\n![a cat](cat.png "Cat")';
		it('replaces the image with a widget when the cursor is elsewhere', () => {
			const [img] = build(doc, 0).widgets;
			expect(img).toMatchObject({ from: 3, to: doc.length });
			const widget = img.widget as SvelteWidget;
			expect(widget.component).toBe(ImageWidget);
			expect(widget.props).toEqual({ src: 'cat.png', alt: 'a cat', title: 'Cat' });
		});
		it('shows the source when the cursor is inside', () => {
			expect(build(doc, 6).widgets).toEqual([]);
		});
		it('uses the image snippet when one is configured', () => {
			const image = createRawSnippet(() => ({ render: () => '<b></b>' }));
			const widget = build(doc, 0, { image }).widgets[0].widget as SvelteWidget;
			expect(widget.component).toBe(SnippetHost);
			expect(widget.props).toMatchObject({ snippet: image, src: 'cat.png', alt: 'a cat' });
		});
	});

	it('always renders task markers as checkboxes', () => {
		const doc = '- [ ] todo\n- [x] done';
		for (const cursor of [0, 3, doc.length]) {
			const widgets = build(doc, cursor).widgets.map((w) => w.widget as SvelteWidget);
			expect(widgets.map((w) => w.component)).toEqual([CheckboxWidget, CheckboxWidget]);
			expect(widgets.map((w) => w.props.checked)).toEqual([false, true]);
		}
	});

	it('replaces horizontal rules away from the cursor', () => {
		const doc = 'a\n\n---\n\nb';
		expect(build(doc, 0).widgets).toEqual([{ from: 3, to: 6, widget: 'HorizontalRuleWidget' }]);
		expect(build(doc, 4).widgets).toEqual([]);
	});

	describe('fenced code', () => {
		const doc = 'intro\n\n```ts\nlet a = 1;\n```\n\nafter';
		it('replaces the whole block with one widget when the cursor is elsewhere', () => {
			const { widgets, lines } = build(doc, 0);
			expect(widgets).toHaveLength(1);
			expect(widgets[0]).toMatchObject({ from: 7, to: doc.indexOf('\n\nafter') });
			const block = widgets[0].widget as SvelteWidget;
			expect(block.component).toBe(CodeBlockWidget);
			expect(block.options.block).toBe(true);
			expect(block.props).toEqual({ language: 'ts', code: 'let a = 1;', headerSnippet: undefined });
			expect(lines).toEqual([]);
		});
		it('shows the raw, styled lines when the cursor is inside', () => {
			const { widgets, lines } = build(doc, 15);
			expect(widgets).toEqual([]);
			expect(lines).toEqual([
				'cm-md-codeblock cm-md-codeblock-begin',
				'cm-md-codeblock',
				'cm-md-codeblock cm-md-codeblock-end'
			]);
		});
		it('passes the header snippet to the block', () => {
			const codeHeader = createRawSnippet(() => ({ render: () => '<b></b>' }));
			const block = build(doc, 0, { codeHeader }).widgets[0].widget as SvelteWidget;
			expect(block.props.headerSnippet).toBe(codeHeader);
		});
		describe('inside a list', () => {
			const indented = '- item\n\n  ```\n  a\n    b\n  ```\n';
			it('strips the fence indentation from the code', () => {
				const block = build(indented, 0).widgets[0].widget as SvelteWidget;
				expect(block.props.code).toBe('a\n  b');
			});
			it('reveals the block when the cursor is at the start of its first line', () => {
				expect(build(indented, indented.indexOf('  ```')).widgets).toEqual([]);
			});
		});
		it('handles an unterminated fence', () => {
			const { widgets } = build('x\n\n```js\ncode', 0);
			expect((widgets[0].widget as SvelteWidget).props).toMatchObject({
				language: 'js',
				code: 'code'
			});
		});
	});
});

describe('SvelteWidget.eq', () => {
	it('compares component and props shallowly', () => {
		const a = new SvelteWidget(CheckboxWidget, { checked: true });
		expect(a.eq(new SvelteWidget(CheckboxWidget, { checked: true }))).toBe(true);
		expect(a.eq(new SvelteWidget(CheckboxWidget, { checked: false }))).toBe(false);
	});
});
