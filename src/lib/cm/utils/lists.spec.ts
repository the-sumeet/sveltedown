import { describe, expect, it } from 'vitest';
import {
	EditorSelection,
	EditorState,
	type StateCommand,
	type Transaction
} from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { indentListItem, outdentListItem } from './lists.js';

/** `|` marks the cursor; two `|`s mark a selection's anchor and head. */
function run(command: StateCommand, text: string, readOnly = false) {
	const first = text.indexOf('|');
	const second = text.indexOf('|', first + 1);
	const doc = text.replaceAll('|', '');
	let state = EditorState.create({
		doc,
		selection: EditorSelection.single(first, second < 0 ? first : second - 1),
		extensions: [markdown({ base: markdownLanguage }), EditorState.readOnly.of(readOnly)]
	});
	ensureSyntaxTree(state, doc.length);
	const handled = command({ state, dispatch: (tr: Transaction) => (state = tr.state) });
	const { anchor, head } = state.selection.main;
	const out = state.doc.toString();
	const marks = anchor === head ? [head] : [anchor, head].sort((a, b) => a - b);
	let result = out;
	for (const pos of marks.reverse()) result = result.slice(0, pos) + '|' + result.slice(pos);
	return { handled, result };
}

describe('indentListItem', () => {
	it.each([
		['nests a bullet item under the previous one', '- a\n- b|', '- a\n  - b|'],
		['indents to the text of a numbered item', '1. a\n2. b|', '1. a\n   2. b|'],
		['nests an empty item', '- a\n- |', '- a\n  - |'],
		['works from anywhere on the line', '- a\n- b|c', '- a\n  - b|c'],
		['moves the children with the item', '- a\n- b|\n  - c', '- a\n  - b|\n    - c'],
		['moves continuation lines', '- a\n- b|\n  more', '- a\n  - b|\n    more'],
		['indents a first item by its own marker', '- a|', '  - a|'],
		['indents every selected item once', '- a\n- |b\n- c|', '- a\n  - |b\n  - c|'],
		['moves a selected parent and child together', '- a\n- |b\n  - c|', '- a\n  - |b\n    - c|']
	])('%s', (_, input, expected) => {
		expect(run(indentListItem, input)).toEqual({ handled: true, result: expected });
	});

	it('leaves Tab alone outside a list', () => {
		expect(run(indentListItem, 'para|graph')).toEqual({ handled: false, result: 'para|graph' });
	});

	it('does nothing when read-only', () => {
		expect(run(indentListItem, '- a\n- b|', true)).toEqual({
			handled: false,
			result: '- a\n- b|'
		});
	});
});

describe('outdentListItem', () => {
	it.each([
		['moves a nested item out a level', '- a\n  - b|', '- a\n- b|'],
		['moves out of a numbered item', '1. a\n   - b|', '1. a\n- b|'],
		['moves the children with the item', '- a\n  - b|\n    - c', '- a\n- b|\n  - c'],
		['keeps a top-level item in place', '- a|', '- a|']
	])('%s', (_, input, expected) => {
		expect(run(outdentListItem, input)).toEqual({ handled: true, result: expected });
	});

	it('leaves Shift-Tab alone outside a list', () => {
		expect(run(outdentListItem, 'para|graph').handled).toBe(false);
	});
});
