import { describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { buildInlineDecorations, hiddenMarkup } from './inline-live-preview.js';
import { isCursorInRange } from '../utils/cursor.js';

function stateWith(doc: string, cursor: number | [number, number]) {
	const selection = Array.isArray(cursor)
		? EditorSelection.single(cursor[0], cursor[1])
		: EditorSelection.cursor(cursor);
	const state = EditorState.create({
		doc,
		selection,
		extensions: markdown({ base: markdownLanguage })
	});
	ensureSyntaxTree(state, doc.length);
	return state;
}

function decorations(doc: string, cursor: number | [number, number]) {
	const state = stateWith(doc, cursor);
	const hidden: [number, number][] = [];
	const classes: { from: number; to: number; cls: string }[] = [];
	buildInlineDecorations(state, [{ from: 0, to: doc.length }]).between(
		0,
		doc.length,
		(from, to, value) => {
			if (value === hiddenMarkup) hidden.push([from, to]);
			else classes.push({ from, to, cls: String(value.spec.class) });
		}
	);
	return { hidden, classes, text: (r: [number, number]) => doc.slice(r[0], r[1]) };
}

describe('isCursorInRange', () => {
	const state = stateWith('0123456789', 5);
	it('counts boundaries as inside', () => {
		expect(isCursorInRange(state, 5, 8)).toBe(true);
		expect(isCursorInRange(state, 2, 5)).toBe(true);
	});
	it('is false away from the range', () => {
		expect(isCursorInRange(state, 6, 9)).toBe(false);
	});
	it('handles selections overlapping the range', () => {
		expect(isCursorInRange(stateWith('0123456789', [1, 3]), 2, 8)).toBe(true);
	});
});

describe('buildInlineDecorations', () => {
	describe('strong emphasis', () => {
		const doc = '**bold** after';
		it('hides the markers when the cursor is elsewhere', () => {
			const d = decorations(doc, doc.length);
			expect(d.hidden).toEqual([
				[0, 2],
				[6, 8]
			]);
			expect(d.classes).toContainEqual({ from: 0, to: 8, cls: 'cm-md-strong' });
		});
		it('reveals the markers when the cursor is inside', () => {
			const d = decorations(doc, 4);
			expect(d.hidden).toEqual([]);
			expect(d.classes).toContainEqual({ from: 0, to: 8, cls: 'cm-md-strong' });
		});
	});

	it('handles emphasis and strikethrough', () => {
		const doc = '*it* ~~gone~~ x';
		const d = decorations(doc, doc.length);
		expect(d.hidden.map(d.text)).toEqual(['*', '*', '~~', '~~']);
		expect(d.classes.map((c) => c.cls)).toEqual(['cm-md-em', 'cm-md-strikethrough']);
		expect(decorations(doc, 7).hidden.map(d.text)).toEqual(['*', '*']);
	});

	it('keeps outer markers visible when the cursor is in a nested node', () => {
		const doc = '**bold *it*** x';
		expect(decorations(doc, 9).hidden).toEqual([]);
	});

	describe('headings', () => {
		const doc = '## Title ##\nbody';
		it('hides the opening and closing marks off the line', () => {
			const d = decorations(doc, doc.length);
			expect(d.hidden.map(d.text)).toEqual(['## ', ' ##']);
			expect(d.classes).toContainEqual({ from: 0, to: 0, cls: 'cm-md-heading cm-md-h2' });
		});
		it('reveals the marks when the cursor is on the line', () => {
			const d = decorations(doc, 5);
			expect(d.hidden).toEqual([]);
			expect(d.classes).toContainEqual({ from: 0, to: 0, cls: 'cm-md-heading cm-md-h2' });
		});
	});

	describe('inline code', () => {
		const doc = 'run `npm i` now';
		it('hides the backticks and styles the content', () => {
			const d = decorations(doc, 0);
			expect(d.hidden.map(d.text)).toEqual(['`', '`']);
			expect(d.classes).toEqual([{ from: 5, to: 10, cls: 'cm-md-code' }]);
		});
		it('reveals the backticks when the cursor is inside', () => {
			expect(decorations(doc, 7).hidden).toEqual([]);
		});
	});

	describe('links', () => {
		const doc = 'see [docs](https://x.dev "Title") here';
		it('hides everything but the text', () => {
			const d = decorations(doc, 0);
			expect(d.hidden.map(d.text)).toEqual(['[', '](https://x.dev "Title")']);
			expect(d.classes).toEqual([{ from: 5, to: 9, cls: 'cm-md-link' }]);
		});
		it('reveals the source when the cursor is inside', () => {
			expect(decorations(doc, 6).hidden).toEqual([]);
		});
		it('leaves reference links alone', () => {
			expect(decorations('[a][ref]\n\n[ref]: http://x', 0).hidden).toEqual([]);
		});
	});

	it('does not hide anything inside fenced code', () => {
		const doc = '```\n**not bold**\n```\nx';
		expect(decorations(doc, doc.length).hidden).toEqual([]);
	});
});
