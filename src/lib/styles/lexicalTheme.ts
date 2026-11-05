import type { EditorThemeClasses } from 'lexical';

/** Default Lexical theme classes. Their styles are in `lexical-theme.css`. */
export const lexicalTheme: EditorThemeClasses = {
	quote: 'sd-quote',
	text: {
		bold: 'sd-bold',
		italic: 'sd-italic',
		underline: 'sd-underline',
		code: 'sd-code',
		strikethrough: 'sd-strikethrough',
		subscript: 'sd-subscript',
		superscript: 'sd-superscript',
		underlineStrikethrough: 'sd-underline-strikethrough'
	},
	list: {
		listitem: 'sd-listitem',
		listitemChecked: 'sd-list-item-checked',
		listitemUnchecked: 'sd-list-item-unchecked',
		nested: { listitem: 'sd-nested-list-item' }
	},
	admonition: {
		danger: 'sd-admonition-danger',
		info: 'sd-admonition-info',
		note: 'sd-admonition-note',
		tip: 'sd-admonition-tip',
		caution: 'sd-admonition-caution'
	}
};
