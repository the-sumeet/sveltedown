<!-- @component Multiple exclusive toggles, like the list type toggle. -->
<script lang="ts" generics="T extends string">
	import { Toolbar } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import type { IconKey } from '../../../defaultSvgIcons.js';
	import { useTranslation } from '../../core/hooks.js';
	import ToolbarContent from './ToolbarContent.svelte';
	import TooltipWrap from './TooltipWrap.svelte';

	interface Props {
		items: { title: string; value: T; icon?: IconKey; contents?: Snippet | string }[];
		onChange: (value: T | '') => void;
		value: T | '';
		ggClass?: string;
		class?: string;
		disabled?: boolean;
	}

	let { items, onChange, value, ggClass, class: className, disabled = false }: Props = $props();

	const t = useTranslation();
</script>

<div class={['sd-toolbar-group-of-groups', ggClass]}>
	<Toolbar.Group
		type="single"
		aria-label={t('toolbar.toggleGroup', 'toggle group')}
		class={['sd-toolbar-toggle-single-group', className].filter(Boolean).join(' ')}
		{disabled}
		bind:value={() => value || '', (next) => onChange(next as T | '')}
	>
		{#each items as item, index (index)}
			<Toolbar.GroupItem
				class="sd-toolbar-toggle-item"
				aria-label={item.title}
				value={item.value}
				data-toolbar-item={true}
			>
				<TooltipWrap title={item.title}>
					<ToolbarContent icon={item.icon} contents={item.contents} />
				</TooltipWrap>
			</Toolbar.GroupItem>
		{/each}
	</Toolbar.Group>
</div>
