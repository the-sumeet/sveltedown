import { syntaxTree } from '@codemirror/language';
import type { EditorState, StateCommand } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import { findNodeAt, linkDestination } from './syntax.js';

export type TableAlign = 'left' | 'center' | 'right' | null;

/** A run of cell text with the same formatting. `from` is relative to the table start. */
export interface TableSegment {
	text: string;
	from: number;
	strong?: boolean;
	em?: boolean;
	strike?: boolean;
	code?: boolean;
	href?: string;
}

/** A cell's trimmed source range (relative to the table start) and its formatted text. */
export interface TableCellData {
	from: number;
	to: number;
	text: string;
	segments: TableSegment[];
}

export interface TableData {
	align: TableAlign[];
	header: TableCellData[];
	/** Body rows, padded or cut to the header's column count (as GFM renders them). */
	rows: TableCellData[][];
}

interface RawRow {
	node: SyntaxNode;
	/** Absolute, trimmed cell ranges. */
	cells: { from: number; to: number }[];
}

/** Cell ranges of a row, split at its `|` delimiters (empty cells have no node). */
function rowCells(state: EditorState, row: SyntaxNode): { from: number; to: number }[] {
	const pipes =
		row.name === 'TableDelimiter'
			? delimiterRowPipes(state, row)
			: row.getChildren('TableDelimiter');
	const starts = [row.from, ...pipes.map((p) => p.to)];
	const ends = [...pipes.map((p) => p.from), row.to];
	let ranges = starts.map((from, i) => ({ from, to: ends[i] }));
	if (pipes.length && pipes[0].from === row.from) ranges = ranges.slice(1);
	if (pipes.length && pipes[pipes.length - 1].to === row.to) ranges = ranges.slice(0, -1);
	return ranges.map(({ from, to }) => {
		const text = state.sliceDoc(from, to);
		const lead = text.length - text.trimStart().length;
		const trimmed = text.trim();
		// An empty cell gets a caret spot one space in, if there is one.
		if (!trimmed) return { from: Math.min(from + 1, to), to: Math.min(from + 1, to) };
		return { from: from + lead, to: from + lead + trimmed.length };
	});
}

/** The delimiter row (`|---|:-:|`) has no child nodes, so find its pipes in the text. */
function delimiterRowPipes(state: EditorState, row: SyntaxNode) {
	const text = state.sliceDoc(row.from, row.to);
	const pipes: { from: number; to: number }[] = [];
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '|') pipes.push({ from: row.from + i, to: row.from + i + 1 });
	}
	return pipes;
}

function tableRows(state: EditorState, table: SyntaxNode): RawRow[] {
	const rows: RawRow[] = [];
	for (let child = table.firstChild; child; child = child.nextSibling) {
		if (['TableHeader', 'TableDelimiter', 'TableRow'].includes(child.name)) {
			rows.push({ node: child, cells: rowCells(state, child) });
		}
	}
	return rows;
}

function alignmentOf(text: string): TableAlign {
	const left = text.startsWith(':');
	const right = text.endsWith(':');
	return left && right ? 'center' : right ? 'right' : left ? 'left' : null;
}

const HIDDEN = new Set([
	'EmphasisMark',
	'StrikethroughMark',
	'CodeMark',
	'LinkMark',
	'URL',
	'LinkTitle'
]);
const STYLES: Record<string, keyof TableSegment> = {
	StrongEmphasis: 'strong',
	Emphasis: 'em',
	Strikethrough: 'strike',
	InlineCode: 'code'
};

/** Formatted text runs for `[from, to]`, with Markdown syntax removed. */
function segmentsOf(state: EditorState, from: number, to: number, base: number): TableSegment[] {
	const hidden: [number, number][] = [];
	const styled: { from: number; to: number; key: keyof TableSegment; href?: string }[] = [];
	syntaxTree(state).iterate({
		from,
		to,
		enter: (ref) => {
			if (ref.to <= from || ref.from >= to) return;
			if (ref.name === 'Escape') hidden.push([ref.from, ref.from + 1]);
			else if (HIDDEN.has(ref.name)) {
				// An autolink's URL is its text; elsewhere the URL is markup.
				if (!(ref.name === 'URL' && ref.node.parent?.name === 'Autolink')) {
					hidden.push([ref.from, ref.to]);
				}
			} else if (STYLES[ref.name])
				styled.push({ from: ref.from, to: ref.to, key: STYLES[ref.name] });
			else if (ref.name === 'Link' || ref.name === 'Autolink') {
				const url = ref.node.getChild('URL');
				if (url)
					styled.push({
						from: ref.from,
						to: ref.to,
						key: 'href',
						href: linkDestination(state, url)
					});
			}
		}
	});

	const cuts = new Set([from, to]);
	for (const [a, b] of hidden) cuts.add(Math.max(from, a)).add(Math.min(to, b));
	for (const s of styled) cuts.add(Math.max(from, s.from)).add(Math.min(to, s.to));
	const points = [...cuts].sort((a, b) => a - b);

	const segments: TableSegment[] = [];
	for (let i = 0; i < points.length - 1; i++) {
		const [a, b] = [points[i], points[i + 1]];
		if (a >= b || hidden.some(([h1, h2]) => a >= h1 && b <= h2)) continue;
		const segment: TableSegment = { text: state.sliceDoc(a, b), from: a - base };
		for (const s of styled) {
			if (a >= s.from && b <= s.to) {
				if (s.key === 'href') segment.href = s.href;
				else (segment as unknown as Record<string, boolean>)[s.key] = true;
			}
		}
		const prev = segments[segments.length - 1];
		const sameStyle =
			prev &&
			prev.from + prev.text.length === segment.from &&
			(['strong', 'em', 'strike', 'code', 'href'] as const).every((k) => prev[k] === segment[k]);
		if (sameStyle) prev.text += segment.text;
		else segments.push(segment);
	}
	return segments;
}

// Identical table source gives an identical model object, so widgets compare equal and
// are not re-rendered while the user edits elsewhere. Bounded to stay small.
const cache = new Map<string, TableData>();

/** Header, body rows and alignment of a GFM table node. */
export function tableData(state: EditorState, table: SyntaxNode): TableData {
	const source = state.sliceDoc(table.from, table.to);
	const cached = cache.get(source);
	if (cached) return cached;

	const rows = tableRows(state, table);
	const cell = ({ from, to }: { from: number; to: number }): TableCellData => {
		const segments = segmentsOf(state, from, to, table.from);
		return {
			from: from - table.from,
			to: to - table.from,
			text: segments.map((s) => s.text).join(''),
			segments
		};
	};
	const [headerRow, delimiterRow, ...bodyRows] = rows;
	const header = headerRow.cells.map(cell);
	const align = header.map((_, i) => {
		const range = delimiterRow?.cells[i];
		return range ? alignmentOf(state.sliceDoc(range.from, range.to)) : null;
	});
	const data: TableData = {
		align,
		header,
		rows: bodyRows.map((row) =>
			header.map((_, i) => {
				const range = row.cells[i];
				if (range) return cell(range);
				const end = row.node.to - table.from;
				return { from: end, to: end, text: '', segments: [] };
			})
		)
	};

	if (cache.size >= 200) cache.delete(cache.keys().next().value!);
	cache.set(source, data);
	return data;
}

const width = (text: string) => [...text].length;

function pad(text: string, size: number, align: TableAlign) {
	const space = size - width(text);
	if (align === 'right') return ' '.repeat(space) + text;
	if (align === 'center') {
		const left = Math.floor(space / 2);
		return ' '.repeat(left) + text + ' '.repeat(space - left);
	}
	return text + ' '.repeat(space);
}

function delimiter(size: number, align: TableAlign) {
	if (align === 'center') return ':' + '-'.repeat(size - 2) + ':';
	if (align === 'right') return '-'.repeat(size - 1) + ':';
	if (align === 'left') return ':' + '-'.repeat(size - 1);
	return '-'.repeat(size);
}

/**
 * Aligns the pipes of the table at the cursor: pads every cell to its column's width,
 * honouring the column alignment. Container prefixes (`> `, list indentation) are kept,
 * cells beyond the header's columns are kept as they are, and the cursor stays in its cell.
 */
export const formatTable: StateCommand = ({ state, dispatch }) => {
	if (state.readOnly) return false;
	const head = state.selection.main.head;
	const table = findNodeAt(state, head, 'Table');
	if (!table) return false;

	const rows = tableRows(state, table);
	const texts = rows.map((row) => row.cells.map((c) => state.sliceDoc(c.from, c.to)));
	const columns = rows[0].cells.length;
	const align = Array.from({ length: columns }, (_, i) =>
		rows[1]?.cells[i] ? alignmentOf(texts[1][i]) : null
	);
	const widths = Array.from({ length: columns }, (_, i) =>
		Math.max(3, ...texts.filter((_, r) => r !== 1).map((cells) => width(cells[i] ?? '')))
	);

	// Where the cursor is: its row, the last cell starting at or before it, and the
	// offset into that cell (0 if it sits in the padding before the text).
	const cursorRow = rows.findIndex(
		(row) => row.node.from <= head && head <= state.doc.lineAt(row.node.to).to
	);
	const cursorCells = rows[cursorRow]?.cells ?? [];
	let cursorCell = 0;
	cursorCells.forEach((cell, i) => {
		if (cell.from <= head) cursorCell = i;
	});
	const cursorOffset = cursorCells.length ? Math.max(0, head - cursorCells[cursorCell].from) : 0;

	let insert = '';
	let newHead = head - table.from;
	rows.forEach((row, r) => {
		if (r > 0) insert += state.sliceDoc(rows[r - 1].node.to, row.node.from);
		let line = '|';
		for (let i = 0; i < Math.max(columns, texts[r].length); i++) {
			const cellText = texts[r][i] ?? '';
			const content =
				i >= columns
					? cellText
					: r === 1
						? delimiter(widths[i], align[i])
						: pad(cellText, widths[i], align[i]);
			if (r === cursorRow && i === cursorCell) {
				const lead = r === 1 || i >= columns ? 0 : content.length - content.trimStart().length;
				newHead = insert.length + line.length + 1 + lead + Math.min(cursorOffset, cellText.length);
			}
			line += ` ${content} |`;
		}
		insert += line;
	});

	const to = rows[rows.length - 1].node.to;
	if (insert === state.sliceDoc(table.from, to)) return true;
	dispatch(
		state.update({
			changes: { from: table.from, to, insert },
			selection: { anchor: table.from + newHead },
			scrollIntoView: true,
			userEvent: 'input.format'
		})
	);
	return true;
};
