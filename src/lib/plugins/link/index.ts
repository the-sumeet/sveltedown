import { namedSignals } from '@lexical/extension';
import {
	AutoLinkNode,
	LinkNode,
	createLinkMatcherWithRegExp,
	registerAutoLink,
	registerLink
} from '@lexical/link';
import { mergeRegister } from '@lexical/utils';
import type { LexicalEditor } from 'lexical';
import { Cell } from '../../realm/index.js';
import { realmPlugin } from '../../realmPlugin.js';
import {
	addActivePlugin$,
	addComposerRegistration$,
	addExportVisitor$,
	addImportVisitor$,
	addLexicalNode$,
	addNestedEditorRegistration$,
	addTableCellEditorRegistration$
} from '../core/index.js';
import { LexicalLinkVisitor } from './LexicalLinkVisitor.js';
import { MdastLinkVisitor } from './MdastLinkVisitor.js';

const URL_REGEX =
	/((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const EMAIL_REGEX =
	/(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const MATCHERS = [
	createLinkMatcherWithRegExp(URL_REGEX, (text) =>
		text.startsWith('http') ? text : `https://${text}`
	),
	createLinkMatcherWithRegExp(EMAIL_REGEX, (text) => `mailto:${text}`)
];

/**
 * Holds whether the auto-linking of URLs and email addresses is disabled.
 * @group Links
 */
export const disableAutoLink$ = Cell(false);

/**
 * A plugin that adds support for links in the editor.
 * @group Links
 */
export const linkPlugin = realmPlugin<{
	/** An optional function to validate the URL of a link. By default, nothing is validated. */
	validateUrl?: (url: string) => boolean;
	/** Whether to disable the auto-linking of URLs and email addresses. */
	disableAutoLink?: boolean;
}>({
	init(realm, params) {
		const disableAutoLink = Boolean(params?.disableAutoLink);
		const register = (editor: LexicalEditor) =>
			mergeRegister(
				registerLink(
					editor,
					namedSignals(
						{
							validateUrl: undefined as undefined | ((url: string) => boolean),
							attributes: undefined
						},
						{ validateUrl: params?.validateUrl }
					)
				),
				disableAutoLink
					? () => undefined
					: registerAutoLink(editor, { matchers: MATCHERS, changeHandlers: [], excludeParents: [] })
			);
		realm.pubIn({
			[addActivePlugin$]: 'link',
			[addImportVisitor$]: MdastLinkVisitor,
			[addLexicalNode$]: [LinkNode, AutoLinkNode],
			[addExportVisitor$]: LexicalLinkVisitor,
			[disableAutoLink$]: disableAutoLink,
			[addComposerRegistration$]: register,
			[addNestedEditorRegistration$]: register,
			[addTableCellEditorRegistration$]: register
		});
	}
});
