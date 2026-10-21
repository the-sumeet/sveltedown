import { describe, expect, it } from 'vitest';
import {
	EditorSelection,
	EditorState,
	type StateCommand,
	type Transaction
} from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { insertLink, toggleBold, toggleItalic, toggleStrikethrough } from './keymaps.js';

/** `|` marks the cursor; `[` and `]` mark a selection's anchor and head. */
function parse(text: string) {
	const cursor = text.indexOf('|');
	if (cursor >= 0) return { doc: text.replace('|', ''), selection: EditorSelection.single(cursor) };
	const open = text.indexOf('[');
	const close = text.indexOf(']') - 1;
	return {
		doc: text.replace('[', '').replace(']', ''),
		selection: EditorSelection.single(open, close)
	};
}

function show(state: EditorState) {
	const { anchor, head } = state.selection.main;
	const doc = state.doc.toString();
	if (anchor === head) return doc.slice(0, head) + '|' + doc.slice(head);
	return doc.slice(0, anchor) + '[' + doc.slice(anchor, head) + ']' + doc.slice(head);
}

function run(command: StateCommand, text: string, readOnly = false) {
	const { doc, selection } = parse(text);
	let state = EditorState.create({
		doc,
		selection,
		extensions: [markdown({ base: markdownLanguage }), EditorState.readOnly.of(readOnly)]
	});
	ensureSyntaxTree(state, doc.length);
	const handled = command({
		state,
		dispatch: (tr: Transaction) => (state = tr.state)
	});
	return { handled, result: show(state) };
}

describe('toggleBold', () => {
	it.each([
		['wraps the selection', 'a [word] b', 'a **[word]** b'],
		['wraps the word at the cursor', 'a wo|rd b', 'a **wo|rd** b'],
		['inserts empty markers away from words', 'a | b', 'a **|** b'],
		['keeps whitespace outside the markers', 'a[ word ]b', 'a **[word]** b'],
		['unwraps when the cursor is inside', 'a **wo|rd** b', 'a wo|rd b'],
		['unwraps a selection inside', 'a **[word]** b', 'a [word] b'],
		['unwraps a selection of the whole node', 'a [**word**] b', 'a [word] b']
	])('%s', (_, input, expected) => {
		expect(run(toggleBold, input).result).toBe(expected);
	});

	it('does nothing when read-only', () => {
		expect(run(toggleBold, 'a [word] b', true)).toEqual({ handled: false, result: 'a [word] b' });
	});
});

describe('toggleItalic', () => {
	it('wraps and unwraps with single markers', () => {
		expect(run(toggleItalic, 'a wo|rd').result).toBe('a *wo|rd*');
		expect(run(toggleItalic, 'a *wo|rd*').result).toBe('a wo|rd');
		expect(run(toggleItalic, 'a _wo|rd_').result).toBe('a wo|rd');
	});

	it('does not treat bold markers as italic', () => {
		expect(run(toggleItalic, 'a **wo|rd**').result).toBe('a ***wo|rd***');
	});

	it('removes only the italic part of bold italic', () => {
		expect(run(toggleItalic, '***wo|rd***').result).toBe('**wo|rd**');
	});
});

describe('toggleStrikethrough', () => {
	it('wraps and unwraps', () => {
		expect(run(toggleStrikethrough, 'a wo|rd').result).toBe('a ~~wo|rd~~');
		expect(run(toggleStrikethrough, 'a ~~wo|rd~~').result).toBe('a wo|rd');
	});
});

describe('insertLink', () => {
	it.each([
		['wraps the selection and selects the url', 'see [docs] now', 'see [docs]([url]) now'],
		['uses the word at the cursor', 'see do|cs now', 'see [docs]([url]) now'],
		['puts the cursor in the brackets with no text', 'see | now', 'see [|](url) now'],
		['turns a selected url into the target', '[https://x.dev]', '[|](https://x.dev)']
	])('%s', (_, input, expected) => {
		expect(run(insertLink, input).result).toBe(expected);
	});
});
