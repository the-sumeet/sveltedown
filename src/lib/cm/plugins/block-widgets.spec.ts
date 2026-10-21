import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { createRawSnippet } from 'svelte';
import { EditorView, type DecorationSet } from '@codemirror/view';
import {
	blockWidgetsField,
	buildBlockDecorations,
	widgetSnippets,
	type WidgetSnippets
} from './block-widgets.js';
import { focusTracking, setEditorFocused } from '../utils/cursor.js';
import type { TableData } from '../utils/tables.js';
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
			expect(block.props).toEqual({
				language: 'ts',
				info: 'ts',
				code: 'let a = 1;',
				headerSnippet: undefined
			});
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

describe('review regressions', () => {
	const props = (doc: string, cursor = 0) =>
		(build(doc, cursor).widgets[0].widget as SvelteWidget).props;

	it('strips blockquote markers from code inside a quote', () => {
		expect(props('x\n\n> ```js\n> foo\n>   bar\n>\n> baz\n> ```\n\nend').code).toBe(
			'foo\n  bar\n\nbaz'
		);
	});

	it('strips top-level fence indentation as CommonMark specifies', () => {
		expect(props('x\n\n  ```\n  a\n    b\n\n  c\n  ```').code).toBe('a\n  b\n\nc');
	});

	it('keeps list bullets visible: the widget starts at the fence, not the line', () => {
		const doc = 'x\n\n- ```js\n  code\n  ```\n\nend';
		const [block] = build(doc, 0).widgets;
		expect(doc.slice(block.from, block.from + 3)).toBe('```');
		expect((block.widget as SvelteWidget).props.code).toBe('code');
	});

	it('uses the first word of the info string as the language', () => {
		expect(props('x\n\n```ts title="a.ts" {1,3}\ncode\n```')).toMatchObject({
			language: 'ts',
			info: 'ts title="a.ts" {1,3}'
		});
	});

	it('decodes angle-bracket destinations and escapes in image URLs and titles', () => {
		expect(props('x\n\n![a](<my img.png> "say \\"hi\\"")')).toMatchObject({
			src: 'my img.png',
			title: 'say "hi"'
		});
	});
});

describe('reveal depends on focus and editability', () => {
	const doc = 'x\n\n![a](a.png)';
	const imageCount = (state: EditorState) => {
		let count = 0;
		state.field(blockWidgetsField).between(0, state.doc.length, (_f, _t, v) => {
			if (v.spec.widget instanceof SvelteWidget) count++;
		});
		return count;
	};
	const create = (editable = true) => {
		const state = EditorState.create({
			doc,
			selection: { anchor: doc.length },
			extensions: [
				markdown({ base: markdownLanguage }),
				focusTracking(),
				blockWidgetsField,
				EditorView.editable.of(editable)
			]
		});
		ensureSyntaxTree(state, doc.length);
		return state.update({}).state;
	};

	it('keeps everything rendered until the editor is focused', () => {
		const state = create();
		expect(imageCount(state)).toBe(1);
		const focused = state.update({ effects: setEditorFocused.of(true) }).state;
		expect(imageCount(focused)).toBe(0);
		expect(imageCount(focused.update({ effects: setEditorFocused.of(false) }).state)).toBe(1);
	});

	it('never reveals source in a read-only editor', () => {
		const state = create(false).update({ effects: setEditorFocused.of(true) }).state;
		expect(imageCount(state)).toBe(1);
	});
});

describe('selection-only updates', () => {
	const doc = '```\nfar away\n```\n\npara one\n\npara two\n\n![a](a.png)';
	const stateAt = (cursor: number) => {
		const state = EditorState.create({
			doc,
			selection: { anchor: cursor },
			extensions: [markdown({ base: markdownLanguage }), blockWidgetsField]
		});
		ensureSyntaxTree(state, doc.length);
		return state;
	};
	const widgetsOf = (state: EditorState) => {
		const out: SvelteWidget[] = [];
		state.field(blockWidgetsField).between(0, doc.length, (_f, _t, v) => {
			if (v.spec.widget instanceof SvelteWidget) out.push(v.spec.widget);
		});
		return out;
	};

	it('keeps untouched widgets and matches a full rebuild', () => {
		const start = stateAt(doc.indexOf('para one'));
		const [codeBefore] = widgetsOf(start);
		const moved = start.update({ selection: { anchor: doc.indexOf('para two') } }).state;
		expect(widgetsOf(moved)[0]).toBe(codeBefore);

		const intoImage = moved.update({ selection: { anchor: doc.length - 2 } }).state;
		const expected = buildBlockDecorations(intoImage);
		const ranges = (set: DecorationSet) => {
			const out: string[] = [];
			set.between(0, doc.length, (f, t, v) => {
				out.push(`${f}-${t}:${v.spec.class ?? v.spec.widget?.constructor.name}`);
			});
			return out;
		};
		expect(ranges(intoImage.field(blockWidgetsField))).toEqual(ranges(expected));
		expect(widgetsOf(intoImage)).toHaveLength(1);
	});
});

describe('tables', () => {
	const doc = 'intro\n\n| a | b |\n|---|--:|\n| 1 | 2 |\n\nend';

	it('renders the table as one widget away from the cursor', () => {
		const { widgets, lines } = build(doc, 0);
		expect(widgets).toHaveLength(1);
		expect(widgets[0]).toMatchObject({ from: 7, to: doc.indexOf('\n\nend') });
		const table = (widgets[0].widget as SvelteWidget).props.table as TableData;
		expect(table.align).toEqual([null, 'right']);
		expect(table.rows[0].map((c) => c.text)).toEqual(['1', '2']);
		expect(lines).toEqual([]);
	});

	it('shows raw, monospace rows when the cursor is in the table', () => {
		const { widgets, lines } = build(doc, doc.indexOf('| 1'));
		expect(widgets).toEqual([]);
		expect(lines).toEqual(['cm-md-table-line', 'cm-md-table-line', 'cm-md-table-line']);
	});

	it('keeps a quote marker before the table visible', () => {
		const quoted = 'x\n\n> | q |\n> |---|\n> | 1 |';
		const [block] = build(quoted, 0).widgets;
		expect(quoted.slice(block.from, block.from + 3)).toBe('| q');
	});

	it('uses the table snippet when one is configured', () => {
		const table = createRawSnippet(() => ({ render: () => '<b></b>' }));
		const widget = build(doc, 0, { table }).widgets[0].widget as SvelteWidget;
		expect(widget.component).toBe(SnippetHost);
		expect(widget.props.snippet).toBe(table);
	});
});
