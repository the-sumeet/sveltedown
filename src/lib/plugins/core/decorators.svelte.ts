import { mount, unmount, type Component } from 'svelte';
import type { LexicalEditor, NodeKey } from 'lexical';
import DecoratorHost from './DecoratorHost.svelte';

/**
 * What a `DecoratorNode` returns from `decorate()`: the component to render in the node's
 * DOM element, and its props.
 */
export interface SvelteDecorator {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each node has its own props
	component: Component<any>;
	props: Record<string, unknown>;
}

/** The reactive state of one mounted decorator. Raw, so that nodes and mdast aren't proxied. */
export class DecoratorState {
	decorator = $state.raw() as SvelteDecorator;

	constructor(decorator: SvelteDecorator) {
		this.decorator = decorator;
	}
}

interface MountedDecorator {
	element: HTMLElement;
	state: DecoratorState;
	instance: Record<string, unknown>;
}

/**
 * Renders the editor's decorator nodes as Svelte components. Components are mounted outside the
 * component tree, so `context` carries the surrounding contexts (see `getAllContexts`).
 * Register this before setting the root element, which is when the first decorators arrive.
 */
export function registerSvelteDecorators(
	editor: LexicalEditor,
	context: Map<unknown, unknown>
): () => void {
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- bookkeeping, nothing reads this reactively
	const mounted = new Map<NodeKey, MountedDecorator>();

	const remove = (key: NodeKey, entry: MountedDecorator) => {
		mounted.delete(key);
		void unmount(entry.instance);
	};

	const unregister = editor.registerDecoratorListener<SvelteDecorator>((decorators) => {
		for (const [key, entry] of mounted) {
			if (!decorators[key]?.component) remove(key, entry);
		}
		for (const [key, decorator] of Object.entries(decorators)) {
			// Some Lexical nodes, like the horizontal rule, are decorators without any content.
			if (!decorator?.component) continue;
			const element = editor.getElementByKey(key);
			const entry = mounted.get(key);
			if (entry && entry.element !== element) remove(key, entry);
			if (!element) continue;

			const current = mounted.get(key);
			if (current) {
				current.state.decorator = decorator;
				continue;
			}
			const state = new DecoratorState(decorator);
			const instance = mount(DecoratorHost, { target: element, props: { state }, context });
			mounted.set(key, { element, state, instance });
		}
	});

	return () => {
		unregister();
		for (const [key, entry] of mounted) remove(key, entry);
	};
}
