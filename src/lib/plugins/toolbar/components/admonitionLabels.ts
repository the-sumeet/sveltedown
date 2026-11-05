import type { ADMONITION_TYPES } from '../../../directive-editors/AdmonitionDirectiveDescriptor.js';
import type { Translation } from '../../core/index.js';

export function admonitionLabelsMap(
	t: Translation
): Record<(typeof ADMONITION_TYPES)[number], string> {
	return {
		note: t('admonitions.note', 'Note'),
		tip: t('admonitions.tip', 'Tip'),
		danger: t('admonitions.danger', 'Danger'),
		info: t('admonitions.info', 'Info'),
		caution: t('admonitions.caution', 'Caution')
	};
}
