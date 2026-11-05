<script lang="ts">
	import type { TextFormatType } from 'lexical';
	import type { IconKey } from '../../../defaultSvgIcons.js';
	import type { FORMAT } from '../../../FormatConstants.js';
	import { useCellValue, usePublisher } from '../../../realm/hooks.js';
	import Icon from '../../../ui/Icon.svelte';
	import { applyFormat$, currentFormat$ } from '../../core/index.js';
	import ToggleSingleGroupWithItem from '../primitives/ToggleSingleGroupWithItem.svelte';

	interface Props {
		format: FORMAT;
		addTitle: string;
		removeTitle: string;
		icon: IconKey;
		formatName: TextFormatType;
	}

	let { format, addTitle, removeTitle, icon, formatName }: Props = $props();

	const currentFormat = useCellValue(currentFormat$);
	const applyFormat = usePublisher(applyFormat$);
	const active = $derived((currentFormat.current & format) !== 0);
</script>

<ToggleSingleGroupWithItem
	title={active ? removeTitle : addTitle}
	on={active}
	onValueChange={() => {
		applyFormat(formatName);
	}}
>
	<Icon name={icon} />
</ToggleSingleGroupWithItem>
