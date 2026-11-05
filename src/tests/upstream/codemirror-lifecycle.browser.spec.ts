// Ported from upstream's src/test/codemirror-lifecycle.test.tsx.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewPlugin, type EditorView } from '@codemirror/view';
import { $getRoot, type LexicalEditor } from 'lexical';
import {
	$isCodeBlockNode,
	codeBlockPlugin,
	codeMirrorPlugin,
	rootEditor$,
	type CodeBlockLanguageSupport,
	type Realm
} from '#lib';
import { renderEditor } from '../helpers.js';
import { expectSoon } from '../dom.js';

const loaders = vi.hoisted(() => ({ first: vi.fn(), second: vi.fn() }));

vi.mock('@codemirror/language-data', () => ({
	languages: [
		{ name: 'first', alias: [], extensions: [], load: loaders.first },
		{ name: 'second', alias: [], extensions: [], load: loaders.second }
	]
}));

function deferredSupport() {
	let resolve!: (support: CodeBlockLanguageSupport) => void;
	let reject!: (reason: Error) => void;
	const promise = new Promise<CodeBlockLanguageSupport>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

async function renderCodeBlock() {
	let editor!: LexicalEditor;
	const created: EditorView[] = [];
	const destroyed: EditorView[] = [];
	const lifecycle = ViewPlugin.define((view) => {
		created.push(view);
		return { destroy: () => destroyed.push(view) };
	});
	const result = await renderEditor({
		markdown: '```first\noriginal code\n```',
		plugins: [
			codeBlockPlugin(),
			codeMirrorPlugin({
				codeBlockLanguages: { first: 'First', second: 'Second' },
				codeMirrorExtensions: [lifecycle]
			}),
			{ postInit: (realm: Realm) => (editor = realm.getValue(rootEditor$)!) }
		]
	});
	const setLanguage = (language: string) => {
		editor.update(
			() => {
				const node = $getRoot().getFirstChildOrThrow();
				if (!$isCodeBlockNode(node)) throw new Error('Expected a code block');
				node.setLanguage(language);
			},
			{ discrete: true }
		);
	};
	return { ...result, created, destroyed, setLanguage };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 30));

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('CodeMirror asynchronous language loading', () => {
	it('does not create an editor after its code block is unmounted', async () => {
		const first = deferredSupport();
		loaders.first.mockReturnValue(first.promise);
		const { unmount, created } = await renderCodeBlock();
		await expectSoon(() => loaders.first.mock.calls.length === 1);
		await unmount();
		first.resolve({ extension: [] });
		await first.promise;
		await flush();
		expect(created).toHaveLength(0);
	});

	it('does not replace the current editor when an older language finishes loading last', async () => {
		const first = deferredSupport();
		const second = deferredSupport();
		loaders.first.mockReturnValue(first.promise);
		loaders.second.mockReturnValue(second.promise);
		const { container, unmount, created, destroyed, setLanguage } = await renderCodeBlock();
		await expectSoon(() => loaders.first.mock.calls.length === 1);
		setLanguage('second');
		await expectSoon(() => loaders.second.mock.calls.length === 1);
		second.resolve({ extension: [] });
		await second.promise;
		await expectSoon(() => created.length === 1);
		const current = created[0];
		current.dispatch({ changes: { from: 0, to: current.state.doc.length, insert: 'newer edits' } });
		first.resolve({ extension: [] });
		await first.promise;
		await flush();
		expect(created).toHaveLength(1);
		expect(container.querySelector('.cm-editor')).toBe(current.dom);
		expect(current.state.doc.toString()).toBe('newer edits');
		await unmount();
		expect(destroyed).toEqual([current]);
	});

	it('does not create a fallback editor when a language load rejects after unmount', async () => {
		const first = deferredSupport();
		loaders.first.mockReturnValue(first.promise);
		const warning = vi.spyOn(console, 'warn');
		const { unmount, created } = await renderCodeBlock();
		await expectSoon(() => loaders.first.mock.calls.length === 1);
		await unmount();
		first.reject(new Error('Language download failed'));
		await first.promise.catch(() => undefined);
		await flush();
		expect(warning).toHaveBeenCalledWith('failed to load language support for', 'first');
		expect(created).toHaveLength(0);
	});
});
