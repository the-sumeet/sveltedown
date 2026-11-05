<!-- @component A toolbar button primitive. -->
<script lang="ts">
	import { Toolbar } from 'bits-ui';
	import type { ComponentProps } from 'svelte';

	type Props = ComponentProps<typeof Toolbar.Button> & { class?: string };

	let { class: className, children, ...rest }: Props = $props();
</script>

<Toolbar.Button
	{...rest}
	class={['sd-toolbar-button', className].filter(Boolean).join(' ')}
	data-toolbar-item={true}
>
	{@render children?.()}
</Toolbar.Button>
