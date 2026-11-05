<!-- The icon or snippet shown inside a toolbar toggle. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { IconKey } from '../../../defaultSvgIcons.js';
	import Icon from '../../../ui/Icon.svelte';

	let { icon, contents }: { icon?: IconKey; contents?: Snippet | string } = $props();
</script>

{#if icon}
	<Icon name={icon} />
{:else if typeof contents === 'string'}
	{contents}
{:else if contents}
	{@render contents()}
{/if}
