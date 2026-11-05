import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { Cell, type Realm } from '../../realm/index.js';
import { realmPlugin } from '../../realmPlugin.js';
import { addComposerChild$ } from '../core/index.js';
import RemotePluginRegister from './RemotePluginRegister.svelte';

const contextKey = Symbol('sveltedown-remote-realms');

interface RemoteRealms {
	editorMap: Map<string, Realm>;
	registerEditor(id: string, realm: Realm): void;
	unregisterEditor(id: string, realm: Realm): void;
}

/** @internal */
export function setRemoteRealmsContext(): void {
	const editorMap = new SvelteMap<string, Realm>();
	setContext<RemoteRealms>(contextKey, {
		editorMap,
		registerEditor(id, realm) {
			editorMap.set(id, realm);
		},
		unregisterEditor(id, realm) {
			if (editorMap.get(id) === realm) editorMap.delete(id);
		}
	});
}

/** @internal */
export function getRemoteRealmsContext(): RemoteRealms | undefined {
	return getContext<RemoteRealms | undefined>(contextKey);
}

/** @internal */
export const remoteEditorId$ = Cell<string>('');

/**
 * A plugin that allows you to access the editor's realm outside of the editor's component tree.
 * Requires wrapping your application in the `RemoteMDXEditorRealmProvider` component.
 * @group Utils
 */
export const remoteRealmPlugin = realmPlugin<{
	/** The id to access the realm with. See `useRemoteMDXEditorRealm`. */
	editorId: string;
}>({
	init: (realm, params) => {
		if (params?.editorId) {
			realm.pubIn({
				[remoteEditorId$]: params.editorId,
				[addComposerChild$]: RemotePluginRegister
			});
		}
	}
});

/**
 * Accesses the realm of an editor by its id, through the returned object's reactive `current`
 * property. You need to wrap your tree in the `RemoteMDXEditorRealmProvider` and add the
 * `remoteRealmPlugin` to the editor.
 * @group Utils
 */
export function useRemoteMDXEditorRealm(editorId: string): { readonly current: Realm | undefined } {
	const remote = getRemoteRealmsContext();
	return {
		get current() {
			return remote?.editorMap.get(editorId);
		}
	};
}
