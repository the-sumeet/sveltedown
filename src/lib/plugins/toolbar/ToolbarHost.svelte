<script lang="ts">
	import { useCellValue } from '../../realm/hooks.js';
	import { readOnly$ } from '../core/index.js';
	import { toolbarClassName$, toolbarContents$ } from './index.js';
	import Root from './primitives/Root.svelte';

	const contents = useCellValue(toolbarContents$);
	const className = useCellValue(toolbarClassName$);
	const readOnly = useCellValue(readOnly$);
</script>

<Root class={className.current} readOnly={readOnly.current}>
	{#if contents.current}
		{@render contents.current()}
	{:else}
		This is an empty toolbar. Pass a snippet as `toolbarContents` to the toolbarPlugin to customize
		it.
	{/if}
</Root>
