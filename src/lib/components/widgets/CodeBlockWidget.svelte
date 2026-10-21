<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { EditorView } from '@codemirror/view';
	import type { CodeHeaderSnippetProps } from '../../types.js';
	import { codeOffsetToPos } from '../../cm/utils/code-blocks.js';
	import { caretAt, onScrollbar, textOffset } from '../../cm/utils/dom.js';
	import CodeBlockHeader from './CodeBlockHeader.svelte';

	let {
		language,
		info,
		code,
		headerSnippet,
		view
	}: {
		language: string;
		info: string;
		code: string;
		headerSnippet?: Snippet<[CodeHeaderSnippetProps]>;
		view: EditorView;
	} = $props();

	let pre: HTMLPreElement;
	let codeEl: HTMLElement;

	/** Offset into `code` under the pointer, or `null` if it is not over the code. */
	function offsetAt(event: MouseEvent): number | null {
		const caret = caretAt(event);
		if (!caret || !codeEl.contains(caret.node)) return null;
		return textOffset(codeEl, caret.node, caret.offset);
	}

	// The editor ignores events on the <pre> (see `data-widget-interactive`), so its
	// scrollbar and text selection work natively. A plain click opens the block for
	// editing, with the cursor where the user clicked.
	function onclick(event: MouseEvent) {
		if (!window.getSelection()?.isCollapsed || onScrollbar(pre, event)) return;
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
		{@render headerSnippet({ language, info, code, view })}
	{:else}
		<CodeBlockHeader {language} {info} {code} {view} />
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
