import { describe, expect, it } from 'vitest';
import { EditorSelection, EditorState, type TransactionSpec } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import type { EditorView } from '@codemirror/view';
import { codeBlockKeymap, codeOffsetToPos } from './code-blocks.js';

function stateOf(doc: string, selection?: EditorSelection) {
	const state = EditorState.create({
		doc,
		selection,
		extensions: [markdown({ base: markdownLanguage }), EditorState.allowMultipleSelections.of(true)]
	});
	ensureSyntaxTree(state, doc.length);
	return state;
}

describe('codeOffsetToPos', () => {
	const doc = 'x\n\n```js\nab\ncdef\n```';
	const code = 'ab\ncdef';
	const state = stateOf(doc);
	const widgetPos = doc.indexOf('```');

	it.each([
		[0, 'ab'],
		[1, 'b'],
		[3, 'cdef'],
		[5, 'ef'],
		[7, '']
	])('maps offset %i to the matching document position', (offset, rest) => {
		const pos = codeOffsetToPos(state, widgetPos, code, offset)!;
		expect(doc.slice(pos, doc.indexOf('\n', pos) === -1 ? undefined : doc.indexOf('\n', pos))).toBe(
			rest
		);
	});

	it('accounts for stripped indentation inside a list', () => {
		const listDoc = '- item\n\n  ```\n  hello\n  ```';
		const s = stateOf(listDoc);
		const pos = codeOffsetToPos(s, listDoc.indexOf('  ```'), 'hello', 2)!;
		expect(listDoc.slice(pos, pos + 3)).toBe('llo');
	});

	it('returns null away from a code block', () => {
		expect(codeOffsetToPos(state, 0, code, 0)).toBeNull();
	});
});

describe('codeBlockKeymap', () => {
	const doc = 'para\n\n```\nfirst line\n```';
	const run = (key: 'Home' | 'End', selection: EditorSelection, shift = false) => {
		let state = stateOf(doc, selection);
		const view = {
			get state() {
				return state;
			},
			dispatch: (spec: TransactionSpec) => (state = state.update(spec).state)
		} as unknown as EditorView;
		const binding = codeBlockKeymap.find((b) => b.key === key)!;
		const handled = (shift ? binding.shift : binding.run)(view);
		return { handled, ranges: state.selection.ranges.map((r) => [r.anchor, r.head]) };
	};
	const lineStart = doc.indexOf('first');
	const lineEnd = lineStart + 'first line'.length;

	it('moves to the real line end and start inside a code block', () => {
		expect(run('End', EditorSelection.single(lineStart + 2))).toEqual({
			handled: true,
			ranges: [[lineEnd, lineEnd]]
		});
		expect(run('Home', EditorSelection.single(lineStart + 2))).toEqual({
			handled: true,
			ranges: [[lineStart, lineStart]]
		});
	});

	it('extends the selection with shift', () => {
		expect(run('End', EditorSelection.single(lineStart + 2), true).ranges).toEqual([
			[lineStart + 2, lineEnd]
		]);
	});

	it('leaves normal text to the default bindings', () => {
		expect(run('End', EditorSelection.single(1)).handled).toBe(false);
	});
});

describe('review regressions', () => {
	const homeFrom = (doc: string, cursor: number) => {
		let state = stateOf(doc, EditorSelection.single(cursor));
		const view = {
			get state() {
				return state;
			},
			dispatch: (spec: TransactionSpec) => (state = state.update(spec).state)
		} as unknown as EditorView;
		codeBlockKeymap.find((b) => b.key === 'Home')!.run(view);
		return state.selection.main.head;
	};

	it('Home stays inside list indentation in a list-nested code block', () => {
		const doc = '- item\n\n  ```\n  hello\n  ```';
		expect(homeFrom(doc, doc.indexOf('llo'))).toBe(doc.indexOf('hello'));
	});

	it('Home stops after the quote marker in quoted code', () => {
		const doc = '> ```\n> hello\n> ```';
		expect(homeFrom(doc, doc.indexOf('llo'))).toBe(doc.indexOf('hello'));
	});

	it('maps clicks in quoted code past the quote markers', () => {
		const doc = 'x\n\n> ```\n> ab\n> cd\n> ```';
		const state = stateOf(doc);
		const pos = codeOffsetToPos(state, doc.indexOf('> ```'), 'ab\ncd', 4)!;
		expect(doc.slice(pos, pos + 1)).toBe('d');
	});
});
