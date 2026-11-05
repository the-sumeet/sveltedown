import { createContext } from 'svelte';
import { createSubscriber } from 'svelte/reactivity';
import type { NodeRef, Realm } from './index.js';

const [getRealmContext, setRealmContext] = createContext<Realm>();

/** Provides the realm to child components. Must be called during component initialisation. */
export { setRealmContext };

/** The realm of the surrounding editor. */
export function useRealm(): Realm {
	return getRealmContext();
}

/** A reactive reference to a cell value, read through `.current`. */
export interface CellValue<T> {
	readonly current: T;
}

function reactiveValue<T>(realm: Realm, cell: NodeRef<T>): CellValue<T> {
	const subscribe = createSubscriber((update) => realm.sub(cell, update));
	return {
		get current() {
			subscribe();
			return realm.getValue(cell);
		}
	};
}

/** Reads a cell reactively. */
export function useCellValue<T>(cell: NodeRef<T>): CellValue<T> {
	return reactiveValue(useRealm(), cell);
}

/** Reads several cells reactively, as one tuple. */
export function useCellValues<T extends unknown[]>(
	...cells: { [K in keyof T]: NodeRef<T[K]> }
): CellValue<T> {
	const realm = useRealm();
	return reactiveValue(realm, realm.combineCells<T>(...cells));
}

/** Returns a function that publishes into a node. */
export function usePublisher<T>(node: NodeRef<T>): (value: T) => void {
	const realm = useRealm();
	realm.register(node);
	return (value) => {
		realm.pub(node, value);
	};
}

/** A cell's reactive value together with a function that publishes into it. */
export function useCell<T>(cell: NodeRef<T>): [CellValue<T>, (value: T) => void] {
	return [useCellValue(cell), usePublisher(cell)];
}
