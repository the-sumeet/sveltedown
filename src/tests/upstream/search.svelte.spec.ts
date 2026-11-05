// Ported from upstream's src/test/search.test.tsx.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import {
	EmptyTextNodeIndex,
	MDX_FOCUS_SEARCH_NAME,
	MDX_SEARCH_NAME,
	Realm,
	contentEditableRef$,
	debouncedIndexer$,
	editorSearchCursor$,
	editorSearchRanges$,
	editorSearchScrollableContent$,
	editorSearchTerm$,
	editorSearchTermDebounced$,
	editorSearchTextNodeIndex$,
	linkPlugin,
	rangeSearchScan,
	searchOpen$,
	searchPlugin,
	type MarkdownEditorMethods
} from '#lib';
import ToolbarEditor from '../fixtures/ToolbarEditor.svelte';
import SearchControls from '../fixtures/SearchControls.svelte';
import { expectSoon, setValue } from '../dom.js';

class TestHighlight {
	readonly ranges: Range[];
	constructor(...ranges: Range[]) {
		this.ranges = ranges;
	}
}

const highlights = new Map<string, TestHighlight>();
let originalCss: PropertyDescriptor | undefined;
let originalHighlight: PropertyDescriptor | undefined;

beforeEach(() => {
	highlights.clear();
	originalCss = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
	originalHighlight = Object.getOwnPropertyDescriptor(globalThis, 'Highlight');
	Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { highlights } });
	Object.defineProperty(globalThis, 'Highlight', { configurable: true, value: TestHighlight });
});

afterEach(() => {
	if (originalCss) Object.defineProperty(globalThis, 'CSS', originalCss);
	if (originalHighlight) Object.defineProperty(globalThis, 'Highlight', originalHighlight);
	vi.useRealTimers();
});

const label = (name: string) => page.getByLabelText(name, { exact: true }).element() as HTMLElement;
const click = (name: string) =>
	(page.getByRole('button', { name, exact: true }).element() as HTMLElement).click();

async function renderSearchEditor(markdown: string, onchange = vi.fn()) {
	const props = $state({
		markdown,
		onchange,
		plugins: [linkPlugin(), searchPlugin()],
		toolbar: SearchControls,
		editor: undefined as MarkdownEditorMethods | undefined
	});
	await render(ToolbarEditor, props);
	await expect.element(page.getByRole('button', { name: 'Open search' })).toBeInTheDocument();
	click('Open search');
	await expectSoon(() => props.editor !== undefined);
	return props.editor!;
}

async function setSearch(term: string) {
	setValue(label('Search term'), term);
	await expectSoon(() => (label('Search term') as HTMLInputElement).value === term);
}

async function waitForTotal(total: number) {
	await expectSoon(() => label('Search total').textContent === String(total));
}

describe('public search cells and helpers', () => {
	it('keeps every public cell observable and preserves debounce/link behavior', async () => {
		vi.useFakeTimers();
		const realm = new Realm();
		const terms: string[] = [];
		const ranges: Range[][] = [];
		const cursors: number[] = [];
		const opens: boolean[] = [];
		const indexes: string[] = [];
		const scrolls: (HTMLElement | null)[] = [];
		realm.sub(editorSearchTerm$, (value) => terms.push(value));
		realm.sub(editorSearchRanges$, (value) => ranges.push(value));
		realm.sub(editorSearchCursor$, (value) => cursors.push(value));
		realm.sub(searchOpen$, (value) => opens.push(value));
		realm.sub(editorSearchTextNodeIndex$, (value) => indexes.push(value.allText));
		realm.sub(editorSearchScrollableContent$, (value) => scrolls.push(value));

		const range = document.createRange();
		realm.pub(editorSearchRanges$, [range]);
		realm.pub(editorSearchCursor$, 2);
		realm.pub(searchOpen$, true);
		realm.pub(editorSearchTerm$, 'direct');
		realm.pub(editorSearchTextNodeIndex$, { allText: 'direct', nodeIndex: [], offsetIndex: [] });
		const wrapper = document.createElement('div');
		const editable = document.createElement('div');
		wrapper.append(editable);
		realm.pub(contentEditableRef$, { current: editable });
		realm.pub(editorSearchTermDebounced$, 'debounced');
		realm.pub(debouncedIndexer$, { allText: 'debounced-index', nodeIndex: [], offsetIndex: [] });
		await vi.advanceTimersByTimeAsync(251);

		expect(terms).toContain('direct');
		expect(terms.at(-1)).toBe('debounced');
		expect(ranges.at(-1)).toEqual([range]);
		expect(cursors.at(-1)).toBe(2);
		expect(opens.at(-1)).toBe(true);
		expect(indexes).toContain('direct');
		expect(indexes.at(-1)).toBe('debounced-index');
		expect(scrolls.at(-1)).toBe(wrapper);
		expect(realm.getValue(editorSearchTextNodeIndex$)).not.toBe(EmptyTextNodeIndex);
	});

	it('scans a consumer-created TextNodeIndex across nodes and normalized offsets', () => {
		const first = document.createTextNode('alpha ');
		const second = document.createTextNode('ALPHA');
		document.createElement('div').append(first, second);
		const nodeIndex = [
			...Array.from({ length: 6 }, () => first),
			...Array.from({ length: 5 }, () => second)
		];
		const offsetIndex = [
			...Array.from({ length: 6 }, (_, index) => index),
			...Array.from({ length: 5 }, (_, index) => index)
		];
		const ranges = Array.from(
			rangeSearchScan('alpha.*alpha', { allText: 'alpha ALPHA', nodeIndex, offsetIndex })
		);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]?.toString()).toBe('alpha ALPHA');
		const composed = document.createTextNode('é');
		const [normalized] = Array.from(
			rangeSearchScan('é', {
				allText: 'é',
				nodeIndex: [composed, composed],
				offsetIndex: [0, 0]
			})
		);
		expect(normalized?.toString()).toBe('é');
	});
});

describe('state-backed search and replacement', () => {
	it('maps normalized expansions through the real editor without splitting source characters', async () => {
		const editor = await renderSearchEditor('café 🄀 🚀');
		await setSearch('é');
		await waitForTotal(1);
		expect(label('Current match').textContent).toBe('é');
		await setSearch('0');
		// Both terms have one match, so wait for the match itself.
		await expectSoon(() => label('Current match').textContent === '🄀');
		click('Replace all');
		await expectSoon(() => editor.getMarkdown() === 'café $& 🚀');
		expect(editor.getMarkdown()).toBe('café $& 🚀');
	});

	it('deletes a whole-node match without leaving an empty text artifact', async () => {
		const editor = await renderSearchEditor('alpha');
		await setSearch('alpha');
		await waitForTotal(1);
		click('Delete all');
		await expectSoon(() => editor.getMarkdown() === '');
		expect(label('Search total').textContent).toBe('0');
	});

	it('tracks programmatic mutation and recovers from invalid and zero-length regexes', async () => {
		const editor = await renderSearchEditor('al**pha** beta alpha KEEP');
		await setSearch('alpha');
		await waitForTotal(2);
		expect(label('Current match').textContent).toBe('alpha');
		expect(highlights.get(MDX_SEARCH_NAME)?.ranges).toHaveLength(2);
		expect(highlights.get(MDX_FOCUS_SEARCH_NAME)?.ranges).toHaveLength(1);
		editor.setMarkdown('prefix alpha and alpha');
		await waitForTotal(2);
		await setSearch('[');
		await waitForTotal(0);
		expect(editor.getMarkdown()).toBe('prefix alpha and alpha');
		await setSearch('^');
		await waitForTotal(0);
		await setSearch('alpha');
		await waitForTotal(2);
		click('Close with setter');
		expect(highlights.size).toBe(0);
		click('Open search');
		await waitForTotal(2);
		click('Close with cell');
		expect(highlights.size).toBe(0);
	});

	it('replaces split and repeated matches literally in one editor change', async () => {
		const onchange = vi.fn();
		const editor = await renderSearchEditor('al**pha** beta alpha KEEP', onchange);
		await setSearch('alpha');
		await waitForTotal(2);
		const before = onchange.mock.calls.length;
		click('Replace all');
		await expectSoon(() => editor.getMarkdown() === '$& beta $& KEEP');
		expect(onchange.mock.calls.length - before).toBe(1);
		expect(label('Search total').textContent).toBe('0');
	});

	it('replaces a complete linked-text match without detaching its text node', async () => {
		const editor = await renderSearchEditor('[alpha](https://example.com) and alpha');
		await setSearch('alpha');
		await waitForTotal(2);
		click('Replace all');
		await expectSoon(() => editor.getMarkdown() === '[$&](https://example.com) and $&');
		expect(label('Search total').textContent).toBe('0');
	});

	it('fails closed when the document changes between scan and replacement', async () => {
		const editor = await renderSearchEditor('alpha alpha');
		await setSearch('alpha');
		await waitForTotal(2);
		editor.setMarkdown('fresh alpha');
		click('Replace all');
		await expectSoon(() => editor.getMarkdown() === 'fresh alpha');
		await waitForTotal(1);
		expect(editor.getMarkdown()).toBe('fresh alpha');
	});

	it('replaces a match spanning adjacent blocks without changing surrounding text', async () => {
		const editor = await renderSearchEditor('before alpha\n\nKEEP after');
		await setSearch('alphaKEEP');
		await waitForTotal(1);
		click('Replace all');
		await expectSoon(() => editor.getMarkdown() === 'before $& after');
		expect(label('Search total').textContent).toBe('0');
	});

	it('supports public navigation and both external scrolling call shapes', async () => {
		const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo');
		const scrollTo = vi.fn();
		Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
			configurable: true,
			value: scrollTo
		});
		try {
			await renderSearchEditor('alpha beta alpha');
			await setSearch('alpha');
			await waitForTotal(2);
			click('Next match');
			await expectSoon(() => label('Search cursor').textContent === '2');
			click('Previous match');
			await expectSoon(() => label('Search cursor').textContent === '1');
			click('Scroll supplied range');
			click('Scroll first index');
			expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
		} finally {
			if (originalScrollTo)
				Object.defineProperty(HTMLElement.prototype, 'scrollTo', originalScrollTo);
			else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
		}
	});
});
