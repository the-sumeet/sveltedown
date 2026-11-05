/*
 * The reactive state graph behind the editor: a port of the framework-independent part of
 * @mdxeditor/gurx (MIT, Copyright (c) 2024 Petyo Ivanov). The package itself can't be used
 * because it imports React at its entry point. Svelte bindings live in `hooks.svelte.ts`.
 *
 * Nodes are symbols. A definition (`Cell`, `Signal`, `Action`) is global, and each `Realm`
 * instantiates the nodes it touches. Publishing runs one synchronous pass over the graph in
 * topological order, so a node with several sources emits once per pass.
 */

/** A reference to a node, typed by the values that pass through it. */
export type NodeRef<T = unknown> = symbol & { __type?: T };
/** Reports whether two values are equal. Equal values do not re-emit. */
export type Comparator<T> = (previous: T | undefined, current: T) => boolean;
/** `true` compares with `===`, `false` always emits, or pass a custom comparator. */
export type Distinct<T> = boolean | Comparator<T>;
export type NodeInit<T> = (realm: Realm, node: NodeRef<T>) => void;
export type Subscription<T> = (value: T) => unknown;
export type UnsubscribeHandle = () => void;
/** Turns a node into a new node, usually to transform its values. */
export type Operator<In, Out> = (source: NodeRef<In>, realm: Realm) => NodeRef<Out>;

/* eslint-disable @typescript-eslint/no-explicit-any -- the graph is heterogeneous by design */

interface Definition {
	type: 'cell' | 'signal';
	distinct: Distinct<any>;
	initial?: unknown;
	init: NodeInit<any>;
}

interface Projection {
	map: (done: (value: any) => void) => (...args: any[]) => void;
	sink: symbol;
	sources: Set<symbol>;
	pulls: Set<symbol>;
}

interface ExecutionMap {
	participatingNodes: symbol[];
	projections: SetMap<Projection>;
	refCount: RefCount;
}

class RefCount {
	constructor(readonly map = new Map<symbol, number>()) {}
	clone() {
		return new RefCount(new Map(this.map));
	}
	increment(node: symbol) {
		this.map.set(node, (this.map.get(node) ?? 0) + 1);
	}
	decrement(node: symbol, onZero: () => void) {
		const count = this.map.get(node);
		if (count === undefined) return;
		this.map.set(node, count - 1);
		if (count - 1 === 0) onZero();
	}
}

class SetMap<T> {
	private map = new Map<symbol, Set<T>>();
	getOrCreate(key: symbol) {
		let set = this.map.get(key);
		if (!set) {
			set = new Set();
			this.map.set(key, set);
		}
		return set;
	}
	get(key: symbol) {
		return this.map.get(key);
	}
}

const defaultComparator = <T>(previous: T | undefined, current: T) => previous === current;
const definitions = new Map<symbol, Definition>();
const noop = () => {};

function define<T>(definition: Definition): NodeRef<T> {
	const node = Symbol() as NodeRef<T>;
	definitions.set(node, definition);
	return node;
}

/**
 * Defines a stateful node. Subscribers aren't called on subscribe, only when a value is published.
 * Cells are distinct by default.
 */
export function Cell<T>(
	value: T,
	init: NodeInit<T> = noop,
	distinct: Distinct<T> = true
): NodeRef<T> {
	return define<T>({ type: 'cell', distinct, initial: value, init });
}

/** Defines a stateless node that passes on published values. Not distinct by default. */
export function Signal<T>(init: NodeInit<T> = noop, distinct: Distinct<T> = false): NodeRef<T> {
	return define<T>({ type: 'signal', distinct, init });
}

/** Defines a stateless, valueless node, used to trigger side effects. */
export function Action(init: NodeInit<void> = noop): NodeRef<void> {
	return define<void>({ type: 'signal', distinct: false, init });
}

export class Realm {
	private subscriptions = new SetMap<Subscription<any>>();
	private singletonSubscriptions = new Map<symbol, Subscription<any>>();
	private graph = new SetMap<Projection>();
	private state = new Map<symbol, unknown>();
	private distinctNodes = new Map<symbol, Comparator<any>>();
	private executionMaps = new Map<symbol | symbol[], ExecutionMap>();
	private definitionRegistry = new Set<symbol>();
	private combinedCells: { sources: symbol[]; cell: symbol }[] = [];

	/** Initial values override the cell definitions and don't trigger a pass. */
	constructor(initialValues: Record<symbol, unknown> = {}) {
		for (const node of Object.getOwnPropertySymbols(initialValues)) {
			this.state.set(node, initialValues[node]);
		}
	}

	cellInstance<T>(
		value: T,
		distinct: Distinct<T> = true,
		node: NodeRef<T> = Symbol() as NodeRef<T>
	): NodeRef<T> {
		if (!this.state.has(node)) this.state.set(node, value);
		if (distinct !== false && !this.distinctNodes.has(node)) {
			this.distinctNodes.set(node, distinct === true ? defaultComparator : distinct);
		}
		return node;
	}

	signalInstance<T>(
		distinct: Distinct<T> = false,
		node: NodeRef<T> = Symbol() as NodeRef<T>
	): NodeRef<T> {
		if (distinct !== false) {
			this.distinctNodes.set(node, distinct === true ? defaultComparator : distinct);
		}
		return node;
	}

	sub<T>(node: NodeRef<T>, subscription: Subscription<T>): UnsubscribeHandle {
		this.register(node);
		const subscriptions = this.subscriptions.getOrCreate(node);
		subscriptions.add(subscription);
		return () => {
			subscriptions.delete(subscription);
		};
	}

	/** Like `sub`, but replaces the previous `singletonSub` on the node. `undefined` removes it. */
	singletonSub<T>(node: NodeRef<T>, subscription: Subscription<T> | undefined): UnsubscribeHandle {
		this.register(node);
		if (subscription === undefined) this.singletonSubscriptions.delete(node);
		else this.singletonSubscriptions.set(node, subscription);
		return () => {
			this.singletonSubscriptions.delete(node);
		};
	}

	resetSingletonSubs() {
		this.singletonSubscriptions.clear();
	}

	subMultiple<T extends unknown[]>(
		nodes: { [K in keyof T]: NodeRef<T[K]> },
		subscription: Subscription<T>
	): UnsubscribeHandle {
		const sink = this.signalInstance<T>();
		this.connect({
			map:
				(done) =>
				(...values) => {
					done(values);
				},
			sink,
			sources: nodes as unknown as symbol[]
		});
		return this.sub(sink, subscription);
	}

	/** Publishes into several nodes in a single pass. */
	pubIn(values: Record<symbol, unknown>) {
		const keys = Reflect.ownKeys(values) as symbol[];
		const executionMap = this.getExecutionMap(keys);
		const refCount = executionMap.refCount.clone();
		const queue = executionMap.participatingNodes.slice();
		const passState = new Map(this.state);

		// A node that didn't emit releases the nodes that depend on it, and they skip the pass
		// once none of their sources will emit.
		const skip = (node: symbol) => {
			const projections = this.graph.get(node);
			if (!projections) return;
			for (const { sources, sink } of projections) {
				if (!sources.has(node)) continue;
				refCount.decrement(sink, () => {
					queue.splice(queue.indexOf(sink), 1);
					skip(sink);
				});
			}
		};

		for (;;) {
			const node = queue.shift();
			if (node === undefined) break;

			let emitted = false;
			const done = (value: unknown) => {
				const comparator = this.distinctNodes.get(node);
				if (comparator?.(passState.get(node), value)) {
					emitted = false;
					return;
				}
				emitted = true;
				passState.set(node, value);
				if (this.state.has(node)) this.state.set(node, value);
			};

			if (Object.prototype.hasOwnProperty.call(values, node)) {
				done(values[node]);
			} else {
				const projections = executionMap.projections.get(node);
				if (projections) {
					for (const projection of projections) {
						const args = [...projection.sources, ...projection.pulls].map((source) =>
							passState.get(source)
						);
						projection.map(done)(...args);
					}
				}
			}

			if (emitted) {
				const value = passState.get(node);
				this.inContext(() => {
					const subscriptions = this.subscriptions.get(node);
					if (subscriptions) for (const subscription of subscriptions) subscription(value);
				});
				this.singletonSubscriptions.get(node)?.(value);
			} else {
				skip(node);
			}
		}
	}

	/** Connects nodes to a sink. Sources trigger the map; pulls only provide their latest values. */
	connect<T>({
		sources,
		pulls = [],
		map,
		sink
	}: {
		sources: symbol[];
		pulls?: symbol[];
		map: Projection['map'];
		sink: NodeRef<T>;
	}) {
		const projection: Projection = {
			map,
			pulls: new Set(pulls),
			sink: this.register(sink),
			sources: new Set(sources)
		};
		for (const node of [...sources, ...pulls]) {
			this.register(node);
			this.graph.getOrCreate(node).add(projection);
		}
		this.executionMaps.clear();
	}

	pub(node: NodeRef<void>): void;
	pub<T>(node: NodeRef<T>, value: T): void;
	pub(node: symbol, value?: unknown) {
		this.pubIn({ [node]: value });
	}

	pipe<T>(source: NodeRef<T>): NodeRef<T>;
	pipe<T, A>(source: NodeRef<T>, a: Operator<T, A>): NodeRef<A>;
	pipe<T, A, B>(source: NodeRef<T>, a: Operator<T, A>, b: Operator<A, B>): NodeRef<B>;
	pipe<T, A, B, C>(
		source: NodeRef<T>,
		a: Operator<T, A>,
		b: Operator<A, B>,
		c: Operator<B, C>
	): NodeRef<C>;
	pipe<T, A, B, C, D>(
		source: NodeRef<T>,
		a: Operator<T, A>,
		b: Operator<A, B>,
		c: Operator<B, C>,
		d: Operator<C, D>
	): NodeRef<D>;
	pipe(source: symbol, ...operators: Operator<any, any>[]): symbol {
		return this.combineOperators(...operators)(source);
	}

	/** Returns a function creating an input signal whose values reach `target` through `operators`. */
	transformer(...operators: Operator<any, any>[]) {
		return <T>(target: NodeRef<T>): NodeRef<any> => {
			const input = this.signalInstance<any>();
			this.link(this.pipe(input, ...(operators as [Operator<any, any>])), target);
			return input;
		};
	}

	/** Passes everything `source` emits on to `sink`. */
	link<T>(source: NodeRef<T>, sink: NodeRef<T>) {
		this.connect({
			map: (done) => (value) => {
				done(value);
			},
			sink,
			sources: [source]
		});
	}

	/** Creates a signal that emits the latest values of all sources when any of them emits. */
	combine<T extends unknown[]>(...sources: { [K in keyof T]: NodeRef<T[K]> }): NodeRef<T> {
		const sink = this.signalInstance<T>();
		this.connect({
			map:
				(done) =>
				(...values) => {
					done(values);
				},
			sink,
			sources: sources as unknown as symbol[]
		});
		return sink;
	}

	/** Like `combine`, but creates a cell, reused for identical source lists. */
	combineCells<T extends unknown[]>(...sources: { [K in keyof T]: NodeRef<T[K]> }): NodeRef<T> {
		const list = sources as unknown as symbol[];
		const existing = this.combinedCells.find(
			(entry) =>
				entry.sources.length === list.length &&
				entry.sources.every((source, index) => source === list[index])
		);
		if (existing) return existing.cell as NodeRef<T>;
		const cell = this.cellInstance(list.map((source) => this.getValue(source)) as T, true);
		this.connect({
			map:
				(done) =>
				(...values) => {
					done(values);
				},
			sink: cell,
			sources: list
		});
		this.combinedCells.push({ sources: list, cell });
		return cell;
	}

	getValue<T>(node: NodeRef<T>): T {
		this.register(node);
		return this.state.get(node) as T;
	}

	getValues<T extends unknown[]>(nodes: { [K in keyof T]: NodeRef<T[K]> }): T {
		return (nodes as unknown as symbol[]).map((node) => this.getValue(node)) as T;
	}

	/** Runs a node's definition in this realm. Any interaction with a node also does this. */
	register<T>(node: NodeRef<T>): NodeRef<T> {
		const definition = definitions.get(node);
		if (definition === undefined || this.definitionRegistry.has(node)) return node;
		this.definitionRegistry.add(node);
		if (definition.type === 'cell') {
			this.cellInstance(definition.initial, definition.distinct, node);
		} else {
			this.signalInstance(definition.distinct, node);
		}
		this.inContext(() => {
			definition.init(this, node);
		});
		return node;
	}

	private inContext<T>(callback: () => T): T {
		const previous = currentRealm;
		// eslint-disable-next-line @typescript-eslint/no-this-alias -- the current realm is global state
		currentRealm = this;
		try {
			return callback();
		} finally {
			currentRealm = previous;
		}
	}

	/** When `source` emits, sets `cell` to the result of calling `map` with its current value. */
	changeWith<T, K>(cell: NodeRef<T>, source: NodeRef<K>, map: (current: T, next: K) => T) {
		this.connect({
			sources: [source],
			pulls: [cell],
			sink: cell,
			map: (done) => (next, current) => {
				done(map(current, next));
			}
		});
	}

	private calculateExecutionMap(keys: symbol[]): ExecutionMap {
		const participatingNodes: symbol[] = [];
		const visited = new Set<symbol>();
		const pendingPulls = new SetMap<symbol>();
		const refCount = new RefCount();
		const projections = new SetMap<Projection>();

		const visit = (node: symbol, insertAt = 0) => {
			refCount.increment(node);
			if (visited.has(node)) return;
			this.register(node);
			const pulls = pendingPulls.get(node);
			if (pulls) {
				insertAt =
					Math.max(...Array.from(pulls).map((pull) => participatingNodes.indexOf(pull))) + 1;
			}
			const outgoing = this.graph.get(node);
			if (outgoing) {
				for (const projection of outgoing) {
					if (projection.sources.has(node)) {
						projections.getOrCreate(projection.sink).add(projection);
						visit(projection.sink, insertAt);
					} else {
						pendingPulls.getOrCreate(projection.sink).add(node);
					}
				}
			}
			visited.add(node);
			participatingNodes.splice(insertAt, 0, node);
		};

		keys.forEach((key) => {
			visit(key);
		});
		return { participatingNodes, projections, refCount };
	}

	private getExecutionMap(keys: symbol[]): ExecutionMap {
		let cacheKey: symbol | symbol[] = keys;
		if (keys.length === 1) {
			cacheKey = keys[0];
			const cached = this.executionMaps.get(cacheKey);
			if (cached !== undefined) return cached;
		} else {
			for (const [key, map] of this.executionMaps.entries()) {
				if (
					Array.isArray(key) &&
					key.length === keys.length &&
					key.every((node) => keys.includes(node))
				) {
					return map;
				}
			}
		}
		const map = this.calculateExecutionMap(keys);
		this.executionMaps.set(cacheKey, map);
		return map;
	}

	private combineOperators(...operators: Operator<any, any>[]) {
		return (source: symbol): symbol => {
			let node = source;
			for (const operator of operators) node = operator(node as NodeRef<any>, this);
			return node;
		};
	}
}

let currentRealm: Realm | undefined;

function createOperator<In, Out>(
	map: (done: (value: Out) => void) => (...args: any[]) => void,
	pulls: symbol[] = []
): Operator<In, Out> {
	return (source, realm) => {
		const sink = realm.signalInstance<Out>();
		realm.connect({ map, pulls, sink, sources: [source] });
		return sink;
	};
}

/** Maps a node's values. */
export function map<I, O>(mapper: (value: I) => O): Operator<I, O> {
	return createOperator((done) => (value) => {
		done(mapper(value));
	});
}

/** Pairs a node's values with the latest values of other nodes, without reacting to them. */
export function withLatestFrom<I, T extends unknown[]>(
	...nodes: { [K in keyof T]: NodeRef<T[K]> }
): Operator<I, [I, ...T]> {
	return createOperator(
		(done) =>
			(...values) => {
				done(values as [I, ...T]);
			},
		nodes as unknown as symbol[]
	);
}

/** Replaces a node's values with a constant. */
export function mapTo<I, O>(value: O): Operator<I, O> {
	return createOperator((done) => () => {
		done(value);
	});
}

/** Passes on only the values matching the predicate. */
export function filter<I, O extends I = I>(predicate: (value: I) => boolean): Operator<I, O> {
	return createOperator((done) => (value) => {
		if (predicate(value)) done(value);
	});
}

/** Passes on the first value only. */
export function once<I>(): Operator<I, I> {
	return (source, realm) => {
		const sink = realm.signalInstance<I>();
		let passed = false;
		realm.connect({
			map: (done) => (value) => {
				if (!passed) {
					passed = true;
					done(value);
				}
			},
			sink,
			sources: [source]
		});
		return sink;
	};
}

/** Accumulates values, emitting the result of each step. */
export function scan<I, O>(accumulator: (current: O, value: I) => O, seed: O): Operator<I, O> {
	return (source, realm) => {
		const sink = realm.signalInstance<O>();
		let current = seed;
		realm.connect({
			map: (done) => (value) => {
				current = accumulator(current, value);
				done(current);
			},
			sink,
			sources: [source]
		});
		return sink;
	};
}

/** Emits the latest value at most once per `delay` milliseconds. */
export function throttleTime<I>(delay: number): Operator<I, I> {
	return (source, realm) => {
		const sink = realm.signalInstance<I>();
		let latest: I;
		let timer: ReturnType<typeof setTimeout> | null = null;
		realm.sub(source, (value) => {
			latest = value;
			if (timer !== null) return;
			timer = setTimeout(() => {
				timer = null;
				realm.pubIn({ [sink]: latest });
			}, delay);
		});
		return sink;
	};
}

/** Emits the latest value once no new values have arrived for `delay` milliseconds. */
export function debounceTime<I>(delay: number): Operator<I, I> {
	return (source, realm) => {
		const sink = realm.signalInstance<I>();
		let latest: I;
		let timer: ReturnType<typeof setTimeout> | null = null;
		realm.sub(source, (value) => {
			latest = value;
			if (timer !== null) clearTimeout(timer);
			timer = setTimeout(() => {
				realm.pubIn({ [sink]: latest });
			}, delay);
		});
		return sink;
	};
}

/** Defers values to a microtask. */
export function delayWithMicrotask<I>(): Operator<I, I> {
	return (source, realm) => {
		const sink = realm.signalInstance<I>();
		realm.sub(source, (value) => {
			queueMicrotask(() => {
				realm.pubIn({ [sink]: value });
			});
		});
		return sink;
	};
}

/** Defines a cell computed from other nodes. */
export function DerivedCell<T>(
	value: T,
	init: (realm: Realm, node: NodeRef<T>) => NodeRef<T>,
	distinct: Distinct<T> = true
): NodeRef<T> {
	return Cell<T>(
		value,
		(realm, node) => {
			realm.link(init(realm, node), node);
		},
		distinct
	);
}

/** Pairs a node's latest value with the next value of another node, once per source value. */
export function onNext<I, O>(next: NodeRef<O>): Operator<I, [I, O]> {
	return (source, realm) => {
		const sink = realm.signalInstance<[I, O]>();
		const empty = Symbol();
		let pending: I | typeof empty = empty;
		realm.connect({
			map: (done) => (value) => {
				if (pending !== empty) {
					done([pending, value]);
					pending = empty;
				}
			},
			sink,
			sources: [next]
		});
		realm.sub(source, (value) => {
			pending = value;
		});
		return sink;
	};
}

/** Maps a value that may be a promise through loading, resolved and rejected handlers. */
export function handlePromise<I, OutInit, OutThen, OutCatch>(
	onLoad: () => OutInit,
	onSuccess: (value: I) => OutThen,
	onError: (error: unknown) => OutCatch
): Operator<I | Promise<I>, OutInit | OutThen | OutCatch> {
	return (source, realm) => {
		const sink = realm.signalInstance<OutInit | OutThen | OutCatch>();
		realm.sub(source, (value) => {
			if (value !== null && typeof value === 'object' && 'then' in value) {
				realm.pubIn({ [sink]: onLoad() });
				value
					.then((result) => {
						realm.pubIn({ [sink]: onSuccess(result) });
					})
					.catch((error: unknown) => {
						realm.pubIn({ [sink]: onError(error) });
					});
			} else {
				realm.pubIn({ [sink]: onSuccess(value) });
			}
		});
		return sink;
	};
}

function requireRealm(): Realm {
	if (!currentRealm) throw new Error('This function must be called within a realm instance');
	return currentRealm;
}

/** Realm methods for use inside node definitions, acting on the realm that is initialising them. */
export const link: Realm['link'] = (source, sink) => {
	requireRealm().link(source, sink);
};
export const sub: Realm['sub'] = (node, subscription) => requireRealm().sub(node, subscription);
export const pubIn: Realm['pubIn'] = (values) => {
	requireRealm().pubIn(values);
};
export const getValue: Realm['getValue'] = (node) => requireRealm().getValue(node);
export const changeWith: Realm['changeWith'] = (cell, source, mapper) => {
	requireRealm().changeWith(cell, source, mapper);
};
