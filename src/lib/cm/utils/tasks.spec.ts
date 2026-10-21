import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { toggleTask } from './tasks.js';

function toggled(doc: string, pos: number, readOnly = false) {
	const state = EditorState.create({
		doc,
		extensions: [markdown({ base: markdownLanguage }), EditorState.readOnly.of(readOnly)]
	});
	ensureSyntaxTree(state, doc.length);
	const spec = toggleTask(state, pos);
	return spec ? state.update(spec).state.doc.toString() : null;
}

describe('toggleTask', () => {
	it('checks an open task', () => {
		expect(toggled('- [ ] todo', 2)).toBe('- [x] todo');
	});
	it('unchecks a done task, upper or lower case', () => {
		expect(toggled('- [x] done', 2)).toBe('- [ ] done');
		expect(toggled('- [X] done', 2)).toBe('- [ ] done');
	});
	it('only touches the task at the position', () => {
		expect(toggled('- [ ] a\n- [ ] b', 10)).toBe('- [ ] a\n- [x] b');
	});
	it('does nothing away from a task or when read-only', () => {
		expect(toggled('plain text', 2)).toBeNull();
		expect(toggled('- [ ] todo', 2, true)).toBeNull();
	});
});
