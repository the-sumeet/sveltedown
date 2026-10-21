import { mount, unmount, type Component } from 'svelte';
import { WidgetType, type EditorView } from '@codemirror/view';

type AnyProps = Record<string, unknown>;

interface Mounted {
	component: Component<AnyProps>;
	props: AnyProps;
	instance: AnyProps;
}

// Keyed by DOM, not by widget: CodeMirror may hand a DOM node created by one widget
// instance to another through `updateDOM`.
const mounted = new WeakMap<HTMLElement, Mounted>();

const INTERACTIVE = 'button, input, select, textarea, a[href], [data-widget-interactive]';

function shallowEqual(a: AnyProps, b: AnyProps): boolean {
	const keys = Object.keys(a);
	return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

export interface SvelteWidgetOptions {
	/** Render the wrapper as a `div` (for block decorations) instead of a `span`. */
	block?: boolean;
	/** Class for the wrapper element. */
	class?: string;
}

/**
 * A CodeMirror widget that renders a Svelte 5 component. The component receives
 * `props` plus the `view`. Prop changes are applied in place through `updateDOM`
 * rather than remounting.
 */
export class SvelteWidget<P extends AnyProps = AnyProps> extends WidgetType {
	constructor(
		readonly component: Component<P & { view: EditorView }>,
		readonly props: P,
		readonly options: SvelteWidgetOptions = {}
	) {
		super();
	}

	eq(other: WidgetType): boolean {
		return (
			other instanceof SvelteWidget &&
			other.component === this.component &&
			other.options.class === this.options.class &&
			shallowEqual(other.props, this.props)
		);
	}

	toDOM(view: EditorView): HTMLElement {
		const dom = document.createElement(this.options.block ? 'div' : 'span');
		if (this.options.class) dom.className = this.options.class;
		const component = this.component as unknown as Component<AnyProps>;
		const props = $state({ ...this.props, view });
		const instance = mount(component, { target: dom, props });
		mounted.set(dom, { component, props, instance });
		return dom;
	}

	updateDOM(dom: HTMLElement, view: EditorView): boolean {
		const entry = mounted.get(dom);
		if (!entry || entry.component !== (this.component as unknown)) return false;
		if (dom.tagName !== (this.options.block ? 'DIV' : 'SPAN')) return false;
		dom.className = this.options.class ?? '';
		Object.assign(entry.props, this.props, { view });
		return true;
	}

	/** Let interactive controls handle their own events; anything else moves the cursor. */
	ignoreEvent(event: Event): boolean {
		// `selectionchange` targets the document; what matters is where the selection is,
		// so native text selection inside an interactive region doesn't move the cursor.
		const node =
			event.type === 'selectionchange'
				? (event.target as Document).getSelection()?.anchorNode
				: (event.target as Node | null);
		const element = node instanceof Element ? node : node?.parentElement;
		return !!element?.closest(INTERACTIVE);
	}

	destroy(dom: HTMLElement): void {
		const entry = mounted.get(dom);
		if (!entry) return;
		mounted.delete(dom);
		unmount(entry.instance);
	}
}
