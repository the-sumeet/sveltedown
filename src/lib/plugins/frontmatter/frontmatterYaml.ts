import { CORE_SCHEMA, dump, load } from 'js-yaml';

/** A top-level key and value of the frontmatter. */
export interface YamlEntry {
	key: string;
	value: unknown;
}

/** Parses frontmatter into entries. Frontmatter the form can't edit safely is `invalid`. */
export function parseFrontmatter(yaml: string): { entries: YamlEntry[]; invalid: boolean } {
	try {
		const value: unknown = load(yaml, {
			schema: CORE_SCHEMA,
			listener: (event, state) => {
				// Do not round existing large integers while saving unrelated fields.
				if (
					event === 'close' &&
					typeof state.result === 'number' &&
					Number.isInteger(state.result) &&
					!Number.isSafeInteger(state.result)
				) {
					throw new Error('Unsafe integer');
				}
			}
		});
		if (value === undefined) return { entries: [], invalid: false };
		if (value === null || typeof value !== 'object' || Array.isArray(value)) {
			return { entries: [], invalid: true };
		}
		// Recursive aliases can't become form values. Leave their original source untouched.
		JSON.stringify(value);
		return {
			entries: Object.entries(value as Record<string, unknown>).map(([key, entry]) => ({
				key,
				value: entry
			})),
			invalid: false
		};
	} catch {
		return { entries: [], invalid: true };
	}
}

/** Compares values, so that editing then reverting keeps comments, quoting and whitespace. */
export function entriesEqual(a: YamlEntry[], b: YamlEntry[]): boolean {
	// Form values are copies, so alias identity must not count as an edit.
	const options = { schema: CORE_SCHEMA, noRefs: true };
	return dump(a, options) === dump(b, options);
}

/** Serializes entries back to YAML, without the enclosing delimiters. */
export function serializeFrontmatter(entries: YamlEntry[]): string {
	const object = Object.fromEntries(
		entries.filter(({ key }) => key).map(({ key, value }) => [key, value] as const)
	);
	// Strip only the serializer's final newline; more would cut a `|+` block scalar's content.
	return dump(object, { schema: CORE_SCHEMA }).replace(/\n$/, '');
}
