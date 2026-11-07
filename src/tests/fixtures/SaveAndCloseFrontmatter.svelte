<!-- A custom frontmatter editor that saves and closes the dialog in the same tick. -->
<script lang="ts">
	import { frontmatterDialogOpen$, usePublisher, type FrontmatterEditorProps } from '#lib';
	let { yaml, onChange }: FrontmatterEditorProps = $props();
	const setOpen = usePublisher(frontmatterDialogOpen$);
</script>

<button
	onclick={() => {
		onChange('title: saved');
		setOpen(false);
	}}>Save and close: {yaml}</button
>
<button onclick={() => setOpen(false)}>Close without saving</button>
