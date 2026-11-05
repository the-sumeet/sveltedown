<!-- @component Lets components outside of an editor access its realm. See `remoteRealmPlugin`. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setRemoteRealmsContext } from './index.js';

	let { children }: { children: Snippet } = $props();

	setRemoteRealmsContext();
</script>

{@render children()}
