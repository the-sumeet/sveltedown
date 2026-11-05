import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import MarkdownEditor from '#lib/MarkdownEditor.svelte';

describe('MarkdownEditor SSR', () => {
	it('renders on the server without touching the DOM', () => {
		const { body } = render(MarkdownEditor, { props: { markdown: '# Hello' } });
		expect(body).toContain('sveltedown');
	});
});
