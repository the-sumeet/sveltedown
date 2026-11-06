import { describe, expect, it } from 'vitest';
import { mergeStyleAttributes } from './mergeStyleAttributes.js';

describe('mergeStyleAttributes', () => {
	it('keeps colons inside values', () => {
		expect(
			mergeStyleAttributes('background: url(https://example.com/a.png)', 'color: red')
		).toContain('url(https://example.com/a.png)');
	});

	it('lets the second style win', () => {
		expect(mergeStyleAttributes('color: red; margin: 0', 'color: blue')).toMatch(/color: ?blue/);
	});
});
