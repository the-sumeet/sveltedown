<!-- @component Multiple non-exclusive toggles, like the bold/italic/underline toggle. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { IconKey } from '../../../defaultSvgIcons.js';
	import ToggleSingleGroupWithItem from './ToggleSingleGroupWithItem.svelte';
	import ToolbarContent from './ToolbarContent.svelte';

	interface Item {
		title: string;
		/** The name of an editor icon. */
		icon?: IconKey;
		/** Custom contents, instead of an icon. */
		contents?: Snippet | string;
		active: boolean;
		onChange: (active: boolean) => void;
		disabled?: boolean;
	}

	let { items }: { items: Item[] } = $props();
</script>

<div class="sd-toolbar-group-of-groups">
	{#each items as item, index (index)}
		<ToggleSingleGroupWithItem
			title={item.title}
			on={item.active}
			disabled={item.disabled}
			onValueChange={(value) => {
				item.onChange(value === 'on');
			}}
		>
			<ToolbarContent icon={item.icon} contents={item.contents} />
		</ToggleSingleGroupWithItem>
	{/each}
</div>
