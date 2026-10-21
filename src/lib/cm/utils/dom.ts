/** Whether a mouse event lands on `el`'s scrollbar rather than its content. */
export function onScrollbar(el: HTMLElement, event: MouseEvent): boolean {
	const rect = el.getBoundingClientRect();
	return (
		event.clientY >= rect.top + el.clientTop + el.clientHeight ||
		event.clientX >= rect.left + el.clientLeft + el.clientWidth
	);
}

/** The DOM caret position under the pointer, if the browser can tell. */
export function caretAt(event: MouseEvent): { node: Node; offset: number } | null {
	if (document.caretPositionFromPoint) {
		const pos = document.caretPositionFromPoint(event.clientX, event.clientY);
		return pos ? { node: pos.offsetNode, offset: pos.offset } : null;
	}
	if (document.caretRangeFromPoint) {
		const range = document.caretRangeFromPoint(event.clientX, event.clientY);
		return range ? { node: range.startContainer, offset: range.startOffset } : null;
	}
	return null;
}

/** Text length from the start of `container` to a caret position inside it. */
export function textOffset(container: Node, node: Node, offset: number): number {
	const range = document.createRange();
	range.setStart(container, 0);
	range.setEnd(node, offset);
	return range.toString().length;
}
