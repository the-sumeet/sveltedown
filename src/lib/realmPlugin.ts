import type { Realm } from './realm/index.js';

/** A plugin for the editor. */
export interface RealmPlugin {
	init?: (realm: Realm) => void;
	update?: (realm: Realm) => void;
	postInit?: (realm: Realm) => void;
}

/** Creates a function that creates an editor plugin, given its parameters. */
export function realmPlugin<Params>(plugin: {
	/** Called when the editor is mounted and the plugin is initialized. */
	init?: (realm: Realm, params?: Params) => void;
	/** Called after the editor is mounted and all plugins are initialized. */
	postInit?: (realm: Realm, params?: Params) => void;
	/** Called when props or plugins change. Use this to update the realm with the new values. */
	update?: (realm: Realm, params?: Params) => void;
}): (params?: Params) => RealmPlugin {
	return (params) => ({
		init: (realm) => plugin.init?.(realm, params),
		postInit: (realm) => plugin.postInit?.(realm, params),
		update: (realm) => plugin.update?.(realm, params)
	});
}
