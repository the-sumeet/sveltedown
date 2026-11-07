import { CORE_SCHEMA, dump, load } from 'js-yaml';

/**
 * A top-level key and value of the frontmatter.
 * @group Frontmatter
 */
export interface FrontmatterEntry {
	key: string;
	value: unknown;
}

/**
 * Parses frontmatter into its top-level entries. YAML that a key-value form can't edit safely
 * (not a map, a syntax error, an unsafe integer or a recursive alias) is `invalid`.
 * @group Frontmatter
 */
export function parseFrontmatter(yaml: string): { entries: FrontmatterEntry[]; invalid: boolean } {
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

/**
 * Whether two lists of entries hold the same keys and values. When a form's entries equal the
 * parsed ones, keep the original YAML, with its comments, quoting and whitespace.
 * @group Frontmatter
 */
export function frontmatterEntriesEqual(a: FrontmatterEntry[], b: FrontmatterEntry[]): boolean {
	// Form values are copies, so alias identity must not count as an edit.
	const options = { schema: CORE_SCHEMA, noRefs: true };
	return dump(a, options) === dump(b, options);
}

/**
 * Serializes entries back to YAML, without the enclosing delimiters. Entries without a key are
 * dropped, and a repeated key keeps its last value.
 * @group Frontmatter
 */
export function serializeFrontmatter(entries: FrontmatterEntry[]): string {
	const object = Object.fromEntries(
		entries.filter(({ key }) => key).map(({ key, value }) => [key, value] as const)
	);
	// Strip only the serializer's final newline; more would cut a `|+` block scalar's content.
	return dump(object, { schema: CORE_SCHEMA }).replace(/\n$/, '');
}

/**
 * Whether a text input can edit a frontmatter value. Lists, maps and multiline strings can't:
 * a single-line input drops line breaks when focused. Show them read-only and save them unchanged.
 * @group Frontmatter
 */
export function isFrontmatterValueEditable(value: unknown): boolean {
	if (typeof value === 'object' && value !== null) return false;
	return !(typeof value === 'string' && value.includes('\n'));
}

/**
 * The text a form field shows for a frontmatter value. `null` shows as an empty field.
 * @group Frontmatter
 */
export function frontmatterValueText(value: unknown): string {
	return value === null || value === undefined ? '' : String(value);
}

/**
 * The value to save for a form field's text. Fields hold text, so this restores the original
 * value, with its YAML type (`false`, `0`, `null`), when the text is unchanged or was edited
 * then reverted. Pass `undefined` as `original` for a new field. Values that aren't editable
 * (see {@link isFrontmatterValueEditable}) come back unchanged.
 * @group Frontmatter
 */
export function frontmatterFieldValue(text: string, original: unknown): unknown {
	if (!isFrontmatterValueEditable(original)) return original;
	if (original === undefined) return text;
	return text === frontmatterValueText(original) ? original : text;
}
