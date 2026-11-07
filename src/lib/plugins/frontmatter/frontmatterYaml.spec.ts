import { describe, expect, it } from 'vitest';
import {
	frontmatterEntriesEqual,
	frontmatterFieldValue,
	frontmatterValueText,
	isFrontmatterValueEditable,
	parseFrontmatter,
	serializeFrontmatter
} from './frontmatterYaml.js';

describe('frontmatter field values', () => {
	it.each([
		[false, 'false'],
		[0, '0'],
		[null, ''],
		['', ''],
		['2026-10-27', '2026-10-27']
	])('keeps the original %o while its text %o is unchanged', (original, text) => {
		expect(frontmatterValueText(original)).toBe(text);
		expect(frontmatterFieldValue(text, original)).toBe(original);
	});

	it('saves edited text as a string', () => {
		expect(frontmatterFieldValue('true', false)).toBe('true');
		expect(frontmatterFieldValue('2', 1)).toBe('2');
	});

	it('saves the text of a new field, including an empty one', () => {
		expect(frontmatterFieldValue('', undefined)).toBe('');
		expect(frontmatterFieldValue('hello', undefined)).toBe('hello');
	});

	it('keeps structured and multiline values whatever the text', () => {
		const cover = { src: '/old.png' };
		for (const value of [cover, [false, 0], 'first\nsecond']) {
			expect(isFrontmatterValueEditable(value)).toBe(false);
			expect(frontmatterFieldValue('changed', value)).toBe(value);
		}
		expect(isFrontmatterValueEditable('one line')).toBe(true);
		expect(isFrontmatterValueEditable(null)).toBe(true);
	});
});

describe('frontmatter YAML', () => {
	it('round-trips entries', () => {
		const { entries, invalid } = parseFrontmatter('# comment\ntitle: Hello\ndraft: false');
		expect(invalid).toBe(false);
		expect(entries).toEqual([
			{ key: 'title', value: 'Hello' },
			{ key: 'draft', value: false }
		]);
		expect(serializeFrontmatter(entries)).toBe('title: Hello\ndraft: false');
		expect(frontmatterEntriesEqual(entries, [...entries])).toBe(true);
		expect(frontmatterEntriesEqual(entries, [{ key: 'title', value: 'Hello' }])).toBe(false);
	});

	it.each(['cover: [', '[one, two]', 'id: 9223372036854775807'])(
		'marks YAML a form cannot edit as invalid: %s',
		(yaml) => {
			expect(parseFrontmatter(yaml)).toEqual({ entries: [], invalid: true });
		}
	);

	it('drops entries without a key', () => {
		expect(
			serializeFrontmatter([
				{ key: '', value: 'lost' },
				{ key: 'kept', value: 1 }
			])
		).toBe('kept: 1');
	});
});
