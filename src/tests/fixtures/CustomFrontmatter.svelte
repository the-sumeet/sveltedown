<script lang="ts">
	import type { FrontmatterEditorProps } from '#lib';
	let { yaml, onChange }: FrontmatterEditorProps = $props();
</script>

<button onclick={() => onChange('title: custom')}>Custom: {yaml}</button>
