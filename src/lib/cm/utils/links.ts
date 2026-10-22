import { Facet } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Called with a link's destination when the user follows it. Return `true` once the link is
 * handled; otherwise the next handler runs, and finally the default `openLink`.
 */
export type LinkHandler = (url: string, event: MouseEvent) => boolean | void;

/** Handlers for followed links, tried in order before the default `openLink`. */
export const linkHandler = Facet.define<LinkHandler>();

/** Opens a link in a new tab, if it is http, https or mailto (never `javascript:`). */
export function openLink(url: string) {
	let parsed: URL;
	try {
		parsed = new URL(url, window.location.href);
	} catch {
		return;
	}
	if (SAFE_PROTOCOLS.has(parsed.protocol)) window.open(parsed.href, '_blank', 'noopener');
}

/** Follows a link the user clicked: the first `linkHandler` that handles it, else `openLink`. */
export function followLink(view: EditorView, url: string, event: MouseEvent) {
	for (const handler of view.state.facet(linkHandler)) {
		if (handler(url, event) === true) return;
	}
	openLink(url);
}
