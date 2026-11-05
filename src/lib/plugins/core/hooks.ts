import { useCellValue } from '../../realm/hooks.js';
import { translation$, type Translation } from './index.js';

/** Returns a function translating a key. Call it again if the `translation` prop can change. */
export function useTranslation(): Translation {
	const translation = useCellValue(translation$);
	return (key, defaultValue, interpolations) =>
		translation.current(key, defaultValue, interpolations);
}
