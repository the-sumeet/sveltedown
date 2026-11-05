<!-- Uses the editor methods from the parent's mount, like a parent layout effect in React. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { MarkdownEditor, type MarkdownEditorMethods } from '#lib';

	let { report }: { report: { mounted: boolean; markdown: string } } = $props();
	let editor = $state<MarkdownEditorMethods>();

	onMount(() => {
		report.mounted = editor !== undefined;
		editor?.setMarkdown('updated from parent mount');
		setTimeout(() => {
			report.markdown = editor?.getMarkdown() ?? '';
		}, 50);
	});
</script>

<MarkdownEditor bind:this={editor} markdown="initial markdown" />
