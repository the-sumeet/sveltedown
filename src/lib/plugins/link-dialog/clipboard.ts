// `navigator.clipboard` is undefined outside secure contexts (plain http on a non-localhost origin),
// so the deprecated `execCommand('copy')` is kept as a fallback; browsers still support it for copy.
export function canCopyToClipboard(): boolean {
	if (typeof (window.navigator.clipboard as Clipboard | undefined)?.writeText === 'function') {
		return true;
	}
	const doc = document as Partial<Pick<Document, 'execCommand' | 'queryCommandSupported'>>;
	return typeof doc.execCommand === 'function' && doc.queryCommandSupported?.('copy') !== false;
}

export function copyToClipboard(text: string, container: HTMLElement): Promise<boolean> {
	const clipboard = window.navigator.clipboard as Clipboard | undefined;
	if (typeof clipboard?.writeText !== 'function') {
		return Promise.resolve(copyWithExecCommand(text, container));
	}
	// writeText rejects with NotAllowedError when the document is unfocused or a policy blocks it.
	return clipboard.writeText(text).then(
		() => true,
		() => copyWithExecCommand(text, container)
	);
}

function copyWithExecCommand(text: string, container: HTMLElement): boolean {
	const previouslyFocused = document.activeElement;
	const selection = document.getSelection();
	// getRangeAt returns live ranges that selecting the textarea would mutate.
	const previousRanges = selection
		? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange())
		: [];

	const textarea = document.createElement('textarea');
	textarea.value = text;
	// readonly keeps the on-screen keyboard closed on touch devices; fixed positioning avoids a scroll jump.
	textarea.readOnly = true;
	textarea.tabIndex = -1;
	textarea.setAttribute('aria-hidden', 'true');
	Object.assign(textarea.style, {
		position: 'fixed',
		top: '0',
		left: '0',
		opacity: '0',
		pointerEvents: 'none'
	});
	container.appendChild(textarea);

	try {
		textarea.focus({ preventScroll: true });
		textarea.select();
		// iOS ignores select() on readonly fields.
		textarea.setSelectionRange(0, text.length);
		return document.execCommand('copy');
	} catch {
		return false;
	} finally {
		textarea.remove();
		if (selection) {
			selection.removeAllRanges();
			previousRanges.forEach((range) => {
				selection.addRange(range);
			});
		}
		if (previouslyFocused instanceof HTMLElement) {
			previouslyFocused.focus({ preventScroll: true });
		}
	}
}
