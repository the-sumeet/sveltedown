<!-- @component A toolbar button with a tooltip. -->
<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import Button from './Button.svelte';
	import TooltipWrap from './TooltipWrap.svelte';

	type Props = ComponentProps<typeof Button> & { title: string };

	let { title, children, ...rest }: Props = $props();
</script>

<Button aria-label={title} {...rest}>
	<TooltipWrap {title}>{@render children?.()}</TooltipWrap>
</Button>
