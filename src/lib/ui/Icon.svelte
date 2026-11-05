<!-- Renders an editor icon through the `iconComponentFor` prop. -->
<script lang="ts">
	import type { IconKey } from '../defaultSvgIcons.js';
	import { useCellValue } from '../realm/hooks.js';
	import { iconComponentFor$ } from '../plugins/core/index.js';

	let { name }: { name: IconKey } = $props();

	const iconComponentFor = useCellValue(iconComponentFor$);
	const icon = $derived(iconComponentFor.current(name));
</script>

{#if typeof icon === 'string'}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- icon markup comes from the package or the app -->
	{@html icon}
{:else}
	{@const Custom = icon}
	<Custom />
{/if}
