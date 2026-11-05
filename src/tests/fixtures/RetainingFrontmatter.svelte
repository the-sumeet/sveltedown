<script lang="ts" module>
	/** The first `onChange` callback the component received. */
	export const retained: { onChange: ((yaml: string) => void) | null } = { onChange: null };
</script>

<script lang="ts">
	import type { FrontmatterEditorProps } from '#lib';
	let { onChange }: FrontmatterEditorProps = $props();
	// svelte-ignore state_referenced_locally
	retained.onChange ??= onChange;
</script>
