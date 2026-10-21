<script lang="ts">
	import type { Snippet } from 'svelte';

	// `rest` stays reactive, so prop updates reach the snippet without remounting.
	let {
		snippet,
		...rest
	}: { snippet: Snippet<[Record<string, unknown>]> } & Record<string, unknown> = $props();
</script>

{@render snippet(rest)}
