import { describe, expect, it } from 'vitest';
import { EditorSelection, EditorState, type Transaction } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { formatTable, tableData } from './tables.js';

function stateOf(doc: string, cursor = 0) {
	const state = EditorState.create({
		doc,
		selection: EditorSelection.cursor(cursor),
		extensions: markdown({ base: markdownLanguage })
	});
	ensureSyntaxTree(state, doc.length);
	return state;
}

function dataOf(doc: string) {
	const state = stateOf(doc);
	let table = null as ReturnType<typeof syntaxTree>['topNode'] | null;
	syntaxTree(state).iterate({
		enter: (ref) => {
			if (ref.name === 'Table' && !table) table = ref.node;
		}
	});
	return { data: tableData(state, table!), from: table!.from };
}

/** Runs formatTable with the cursor at `¦`; `withCursor` marks the new cursor the same way. */
function format(doc: string, cursorMarker = '¦') {
	const cursor = doc.indexOf(cursorMarker);
	let state = stateOf(doc.replace(cursorMarker, ''), cursor);
	const handled = formatTable({ state, dispatch: (tr: Transaction) => (state = tr.state) });
	const out = state.doc.toString();
	const head = state.selection.main.head;
	return { handled, doc: out, withCursor: out.slice(0, head) + cursorMarker + out.slice(head) };
}

describe('tableData', () => {
	it('reads header, rows and alignment', () => {
		const { data } = dataOf('| a | b | c | d |\n|---|:--|:-:|--:|\n| 1 | 2 | 3 | 4 |');
		expect(data.align).toEqual([null, 'left', 'center', 'right']);
		expect(data.header.map((c) => c.text)).toEqual(['a', 'b', 'c', 'd']);
		expect(data.rows.map((r) => r.map((c) => c.text))).toEqual([['1', '2', '3', '4']]);
	});

	it('handles empty cells, missing outer pipes and uneven rows', () => {
		const { data } = dataOf('a |  | c\n--- | --- | ---\n|  | x\n1 | 2 | 3 | 4');
		expect(data.header.map((c) => c.text)).toEqual(['a', '', 'c']);
		expect(data.rows.map((r) => r.map((c) => c.text))).toEqual([
			['', 'x', ''],
			['1', '2', '3']
		]);
	});

	it('renders inline formatting without its syntax', () => {
		const { data } = dataOf(
			'| cell |\n|---|\n| **b** *i* ~~s~~ `c` [l](https://x.dev) a\\|b <https://y.dev> |'
		);
		const segments = data.rows[0][0].segments;
		expect(data.rows[0][0].text).toBe('b i s c l a|b https://y.dev');
		expect(segments).toContainEqual(expect.objectContaining({ text: 'b', strong: true }));
		expect(segments).toContainEqual(expect.objectContaining({ text: 'i', em: true }));
		expect(segments).toContainEqual(expect.objectContaining({ text: 's', strike: true }));
		expect(segments).toContainEqual(expect.objectContaining({ text: 'c', code: true }));
		expect(segments).toContainEqual(expect.objectContaining({ text: 'l', href: 'https://x.dev' }));
		expect(segments).toContainEqual(
			expect.objectContaining({ text: 'https://y.dev', href: 'https://y.dev' })
		);
	});

	it('keeps cell offsets relative to the table, mapping back to the source', () => {
		const doc = 'intro\n\n| ab | **cd** |\n|---|---|';
		const { data, from } = dataOf(doc);
		const [first, second] = data.header;
		expect(doc.slice(from + first.from, from + first.to)).toBe('ab');
		expect(doc.slice(from + second.segments[0].from, from + second.segments[0].from + 2)).toBe(
			'cd'
		);
	});

	it('returns the same object for the same source', () => {
		const doc = '| a |\n|---|';
		expect(dataOf(doc).data).toBe(dataOf(doc).data);
	});
});

describe('formatTable', () => {
	it('pads cells and the delimiter row to aligned columns', () => {
		expect(format('|a|bbbb|cc|¦\n|-|:-:|-:|\n|long cell|x|y|').doc).toBe(
			[
				'| a         | bbbb |  cc |',
				'| --------- | :--: | --: |',
				'| long cell |  x   |   y |'
			].join('\n')
		);
	});

	it('keeps the cursor in the same cell', () => {
		expect(format('|a|b|\n|-|-|\n|lo¦ng|x|').withCursor).toBe(
			['| a    | b   |', '| ---- | --- |', '| lo¦ng | x   |'].join('\n')
		);
		expect(format('|a|bb|\n|-|-:|\n|x|y¦|').withCursor).toBe(
			['| a   |  bb |', '| --- | --: |', '| x   |   y¦ |'].join('\n')
		);
	});

	it('keeps blockquote prefixes', () => {
		expect(format('> |a|b¦|\n> |-|-|\n> |1|22|').doc).toBe(
			['> | a   | b   |', '> | --- | --- |', '> | 1   | 22  |'].join('\n')
		);
	});

	it('keeps extra cells instead of dropping them', () => {
		expect(format('|a¦|\n|-|\n|1|2|').doc).toBe(['| a   |', '| --- |', '| 1   | 2 |'].join('\n'));
	});

	it('does nothing outside a table', () => {
		expect(format('just ¦text').handled).toBe(false);
	});
});
