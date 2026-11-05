<!-- A toggle button, as a single-choice group with one item. -->
<script lang="ts">
	import { Toolbar } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import TooltipWrap from './TooltipWrap.svelte';

	interface Props {
		on: boolean;
		title: string;
		disabled?: boolean;
		onValueChange: (value: string) => void;
		children: Snippet;
	}

	let { on, title, disabled = false, onValueChange, children }: Props = $props();
</script>

<Toolbar.Group
	type="single"
	class="sd-toolbar-toggle-single-group"
	bind:value={() => (on ? 'on' : 'off'), onValueChange}
>
	<Toolbar.GroupItem
		class="sd-toolbar-toggle-item"
		aria-label={title}
		value="on"
		{disabled}
		data-toolbar-item={true}
	>
		<TooltipWrap {title}>{@render children()}</TooltipWrap>
	</Toolbar.GroupItem>
</Toolbar.Group>
