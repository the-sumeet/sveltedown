const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

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
