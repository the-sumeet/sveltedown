<script lang="ts">
	import type { FrontmatterEditorProps } from '#lib';
	let { yaml }: FrontmatterEditorProps = $props();
</script>

<output aria-label="Other frontmatter">{yaml}</output>
