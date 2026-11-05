import { addExportVisitor$, addImportVisitor$, addLexicalNode$, realmPlugin } from '#lib';
import { CalloutNode, LexicalCalloutVisitor, MdastCalloutVisitor } from './CalloutNode.js';

export const calloutPlugin = realmPlugin({
	init(realm) {
		realm.pubIn({
			[addLexicalNode$]: CalloutNode,
			[addImportVisitor$]: MdastCalloutVisitor,
			[addExportVisitor$]: LexicalCalloutVisitor
		});
	}
});
