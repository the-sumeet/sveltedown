import { $createListItemNode, type ListNode } from '@lexical/list';
import type * as Mdast from 'mdast';
import type { MdastImportVisitor } from '../../importMarkdownToLexical.js';

export const MdastListItemVisitor: MdastImportVisitor<Mdast.ListItem> = {
	testNode: 'listItem',
	visitNode({ mdastNode, actions, lexicalParent }) {
		const isChecked =
			(lexicalParent as ListNode).getListType() === 'check'
				? (mdastNode.checked ?? false)
				: undefined;
		actions.addAndStepInto($createListItemNode(isChecked));
	}
};
