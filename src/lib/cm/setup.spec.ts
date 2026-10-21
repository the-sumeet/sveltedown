import { describe, expect, it } from 'vitest';
import { diffChange } from './setup.js';

function apply(from: string, to: string) {
	const c = diffChange(from, to);
	return from.slice(0, c.from) + c.insert + from.slice(c.to);
}

describe('diffChange', () => {
	it.each([
		['', ''],
		['', 'abc'],
		['abc', ''],
		['hello world', 'hello brave world'],
		['aaaa', 'aa'],
		['# Title\n\nbody', '# Title\n\nnew body'],
		['abc', 'xyz']
	])('turns %j into %j', (from, to) => {
		expect(apply(from, to)).toBe(to);
	});

	it('only touches the changed region', () => {
		expect(diffChange('hello world', 'hello brave world')).toEqual({
			from: 6,
			to: 6,
			insert: 'brave '
		});
	});
});
