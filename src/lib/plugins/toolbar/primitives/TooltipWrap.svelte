<!-- @component Displays an instant tooltip on hover. -->
<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { useCellValue } from '../../../realm/hooks.js';
	import { editorRootElementRef$ } from '../../core/index.js';

	let { title, children }: { title: string; children: Snippet } = $props();

	const editorRootElementRef = useCellValue(editorRootElementRef$);
</script>

<Tooltip.Provider delayDuration={100}>
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<span {...props} class="sd-tooltip-trigger">{@render children()}</span>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Portal to={editorRootElementRef.current?.current}>
			<Tooltip.Content class="sd-tooltip-content" sideOffset={10}>
				{title}
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
</Tooltip.Provider>
