<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useCellValue } from '../../realm/hooks.js';
	import { markdownProcessingError$, viewMode$ } from '../core/index.js';
	import DiffViewer from './DiffViewer.svelte';
	import SourceEditor from './SourceEditor.svelte';

	let { children }: { children: Snippet } = $props();

	const error = useCellValue(markdownProcessingError$);
	const viewMode = useCellValue(viewMode$);
</script>

<!-- The rich text editor stays mounted, otherwise its state is lost. -->
<div class="sveltedown-diff-source-wrapper">
	{#if error.current}
		<div class="sd-markdown-parse-error">
			<p>{error.current.error}.</p>
			<p>You can fix the errors in source mode and switch to rich text mode when you are ready.</p>
		</div>
	{/if}
	<div
		class="sveltedown-rich-text-editor"
		style:display={viewMode.current === 'rich-text' && error.current == null ? 'block' : 'none'}
	>
		{@render children()}
	</div>
	{#if viewMode.current === 'diff'}
		<DiffViewer />
	{/if}
	{#if viewMode.current === 'source'}
		<SourceEditor />
	{/if}
</div>
