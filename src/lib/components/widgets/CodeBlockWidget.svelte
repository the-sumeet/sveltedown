<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { EditorView } from '@codemirror/view';
	import type { CodeHeaderSnippetProps } from '../../types.js';
	import { codeOffsetToPos } from '../../cm/utils/code-blocks.js';
	import CodeBlockHeader from './CodeBlockHeader.svelte';

	let {
		language,
		code,
		headerSnippet,
		view
	}: {
		language: string;
		code: string;
		headerSnippet?: Snippet<[CodeHeaderSnippetProps]>;
		view: EditorView;
	} = $props();

	let pre: HTMLPreElement;
	let codeEl: HTMLElement;

	function onScrollbar(event: MouseEvent): boolean {
		const rect = pre.getBoundingClientRect();
		return (
			event.clientY >= rect.top + pre.clientTop + pre.clientHeight ||
			event.clientX >= rect.left + pre.clientLeft + pre.clientWidth
		);
	}

	/** Offset into `code` under the pointer, or `null` if it is not over the code. */
	function offsetAt(event: MouseEvent): number | null {
		let node: Node | undefined;
		let offset = 0;
		if (document.caretPositionFromPoint) {
			const pos = document.caretPositionFromPoint(event.clientX, event.clientY);
			node = pos?.offsetNode;
			offset = pos?.offset ?? 0;
		} else if (document.caretRangeFromPoint) {
			const range = document.caretRangeFromPoint(event.clientX, event.clientY);
			node = range?.startContainer;
			offset = range?.startOffset ?? 0;
		}
		if (!node || !codeEl.contains(node)) return null;
		const range = document.createRange();
		range.setStart(codeEl, 0);
		range.setEnd(node, offset);
		return range.toString().length;
	}

	// The editor ignores events on the <pre> (see `data-widget-interactive`), so its
	// scrollbar and text selection work natively. A plain click opens the block for
	// editing, with the cursor where the user clicked.
	function onclick(event: MouseEvent) {
		if (!window.getSelection()?.isCollapsed || onScrollbar(event)) return;
		const widgetPos = view.posAtDOM(pre);
		const offset = offsetAt(event);
		const pos =
			offset === null
				? widgetPos
				: (codeOffsetToPos(view.state, widgetPos, code, offset) ?? widgetPos);
		view.dispatch({
			selection: { anchor: pos },
			scrollIntoView: true,
			userEvent: 'select.pointer'
		});
		view.focus();
	}
</script>

<div class="cm-md-code-header">
	{#if headerSnippet}
		{@render headerSnippet({ language, code, view })}
	{:else}
		<CodeBlockHeader {language} {code} {view} />
	{/if}
</div>
<!-- Scrolls on its own, so long lines don't wrap or widen the editor. Keyboard users
     reach the code by moving the editor cursor into the block, so the click is only a shortcut.
     tabindex="-1": pressing here focuses the <pre> rather than the editor, which would
     otherwise restore its own selection and break native text selection. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<pre bind:this={pre} class="cm-md-code-pre" tabindex="-1" data-widget-interactive {onclick}><code
		bind:this={codeEl}>{code}</code
	></pre>
