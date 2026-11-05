<script lang="ts">
	import { Toolbar } from 'bits-ui';
	import type { Snippet } from 'svelte';

	interface Props {
		readOnly?: boolean;
		class?: string;
		children: Snippet;
	}

	let { readOnly = false, class: className, children }: Props = $props();
</script>

<Toolbar.Root
	class={[
		'sveltedown-toolbar',
		'sd-toolbar-root',
		readOnly && 'sd-read-only-toolbar-root',
		className
	]
		.filter(Boolean)
		.join(' ')}
	tabindex={readOnly ? -1 : undefined}
>
	{@render children()}
</Toolbar.Root>
