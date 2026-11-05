import type { Snippet } from 'svelte';
import { Cell } from '../../realm/index.js';
import { realmPlugin } from '../../realmPlugin.js';
import { addBottomAreaChild$, addTopAreaChild$ } from '../core/index.js';
import ToolbarHost from './ToolbarHost.svelte';

/**
 * The snippet with the contents of the toolbar.
 * @group Toolbar
 */
export const toolbarContents$ = Cell<Snippet | null>(null);
export const toolbarClassName$ = Cell<string>('');

/**
 * A plugin that adds a toolbar to the editor.
 * @group Toolbar
 */
export const toolbarPlugin = realmPlugin<{
	/** The contents of the toolbar. */
	toolbarContents: Snippet;
	/** The class name to apply to the toolbar element. */
	toolbarClassName?: string;
	/** Controls the position of the toolbar (top by default). */
	toolbarPosition?: 'top' | 'bottom';
}>({
	init(realm, params) {
		const position = params?.toolbarPosition === 'bottom' ? addBottomAreaChild$ : addTopAreaChild$;
		realm.pubIn({
			[toolbarContents$]: params?.toolbarContents ?? null,
			[toolbarClassName$]: params?.toolbarClassName ?? '',
			[position]: ToolbarHost
		});
	},
	update(realm, params) {
		realm.pub(toolbarContents$, params?.toolbarContents ?? null);
		realm.pub(toolbarClassName$, params?.toolbarClassName ?? '');
	}
});
