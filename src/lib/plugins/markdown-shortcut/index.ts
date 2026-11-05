import {
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	CHECK_LIST,
	CODE,
	type ElementTransformer,
	INLINE_CODE,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	LINK,
	type MultilineElementTransformer,
	ORDERED_LIST,
	QUOTE,
	type Transformer,
	UNORDERED_LIST,
	registerMarkdownShortcuts
} from '@lexical/markdown';
import {
	$createHorizontalRuleNode,
	$isHorizontalRuleNode,
	HorizontalRuleNode
} from '@lexical/extension';
import {
	$createHeadingNode,
	$isHeadingNode,
	HeadingNode,
	type HeadingTagType
} from '@lexical/rich-text';
import type { ElementNode, LexicalEditor, LexicalNode } from 'lexical';
import type { Realm } from '../../realm/index.js';
import { realmPlugin } from '../../realmPlugin.js';
import { $createCodeBlockNode, CodeBlockNode } from '../codeblock/CodeBlockNode.js';
import {
	activePlugins$,
	addComposerRegistration$,
	addNestedEditorRegistration$,
	addTableCellEditorRegistration$
} from '../core/index.js';
import { type HEADING_LEVEL, allowedHeadingLevels$ } from '../headings/index.js';

/**
 * A plugin that adds markdown shortcuts to the editor.
 * @group Markdown Shortcuts
 */
export const markdownShortcutPlugin = realmPlugin({
	init(realm) {
		realm.pubIn({
			[addComposerRegistration$]: registerShortcuts(false),
			[addNestedEditorRegistration$]: registerShortcuts(false),
			[addTableCellEditorRegistration$]: registerShortcuts(true)
		});
	}
});

function registerShortcuts(excludeLists: boolean) {
	return (editor: LexicalEditor, realm: Realm) => {
		let unregister = () => {};
		let headingLevelsKey: string | null = null;

		// Plugins listed after this one have registered by the time this runs, but the allowed
		// heading levels can still change. The headings plugin republishes them on every update.
		const update = () => {
			const levels = realm.getValue(allowedHeadingLevels$);
			const key = levels.join();
			if (key === headingLevelsKey) return;
			headingLevelsKey = key;
			const pluginIds = realm.getValue(activePlugins$);
			const transformers = pickTransformersForActivePlugins(
				pluginIds,
				pluginIds.includes('headings') ? levels : []
			);
			unregister();
			unregister = registerMarkdownShortcuts(
				editor,
				excludeLists ? transformers.filter((t) => !LIST_TRANSFORMERS.has(t)) : transformers
			);
		};
		update();
		const unsubscribe = realm.sub(allowedHeadingLevels$, update);

		return () => {
			unsubscribe();
			unregister();
		};
	};
}

const createBlockNode = (
	createNode: (match: string[]) => ElementNode
): ElementTransformer['replace'] => {
	return (parentNode, children, match) => {
		const node = createNode(match);
		node.append(...children);
		parentNode.replace(node);
		node.select(0, 0);
	};
};

const THEMATIC_BREAK: ElementTransformer = {
	dependencies: [HorizontalRuleNode],
	export: (node: LexicalNode) => {
		return $isHorizontalRuleNode(node) ? '***' : null;
	},
	regExp: /^(---|\*\*\*|___)\s?$/,
	replace: (parentNode, _1, _2, isImport) => {
		const line = $createHorizontalRuleNode();

		// TODO: Get rid of isImport flag
		if (isImport || parentNode.getNextSibling() != null) {
			parentNode.replace(line);
		} else {
			parentNode.insertBefore(line);
		}

		line.selectNext();
	},
	type: 'element'
};

// Lexical's fence pattern has captured the fence itself before the language since 0.50.
function fenceLanguage(match: string[]): string {
	return match.slice(1).find((group) => group && !/^[`~]+$/.test(group)) ?? '';
}

const LIST_TRANSFORMERS: ReadonlySet<Transformer> = new Set([
	ORDERED_LIST,
	UNORDERED_LIST,
	CHECK_LIST
]);

function pickTransformersForActivePlugins(
	pluginIds: string[],
	allowedHeadingLevels: readonly HEADING_LEVEL[]
) {
	const transformers: Transformer[] = [
		BOLD_ITALIC_STAR,
		BOLD_ITALIC_UNDERSCORE,
		BOLD_STAR,
		BOLD_UNDERSCORE,
		INLINE_CODE,
		ITALIC_STAR,
		ITALIC_UNDERSCORE
		// HIGHLIGHT,
		// STRIKETHROUGH
	];

	if (pluginIds.includes('headings') && allowedHeadingLevels.length > 0) {
		const headingRegExp = new RegExp(
			`^(${allowedHeadingLevels.map((level) => '#'.repeat(level)).join('|')})\\s`
		);

		const HEADING: ElementTransformer = {
			dependencies: [HeadingNode],
			export: (node, exportChildren) => {
				if (!$isHeadingNode(node)) {
					return null;
				}
				const level = Number(node.getTag().slice(1));
				return '#'.repeat(level) + ' ' + exportChildren(node);
			},
			regExp: headingRegExp,
			replace: createBlockNode((match) => {
				const tag = `h${match[1].length}` as HeadingTagType;
				return $createHeadingNode(tag);
			}),
			type: 'element'
		};
		transformers.push(HEADING);
	}

	if (pluginIds.includes('thematicBreak')) {
		transformers.push(THEMATIC_BREAK);
	}

	if (pluginIds.includes('quote')) {
		transformers.push(QUOTE);
	}

	if (pluginIds.includes('link')) {
		transformers.push(LINK);
	}
	if (pluginIds.includes('lists')) {
		transformers.push(ORDERED_LIST, UNORDERED_LIST, CHECK_LIST);
	}

	if (pluginIds.includes('codeblock')) {
		const codeTransformerCopy: MultilineElementTransformer = {
			...CODE,
			dependencies: [CodeBlockNode],
			replace: (parentNode, _children, match) => {
				const codeBlockNode = $createCodeBlockNode({
					code: '',
					language: fenceLanguage(match),
					meta: ''
				});
				// this is necessary for lexical to not complain about lost selection. The selection is really lost, but it will get restored in the setTimeout below
				parentNode.selectPrevious();
				parentNode.replace(codeBlockNode);
				setTimeout(() => {
					codeBlockNode.select();
				}, 80);
			}
		};
		transformers.push(codeTransformerCopy);
	}

	return transformers;
}
