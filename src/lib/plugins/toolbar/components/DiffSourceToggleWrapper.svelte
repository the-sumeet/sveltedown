<!--
	@component
	Wraps the toolbar contents and lets the user toggle between rich text, diff and source mode.
	Put the rich text toolbar contents as children. Needs the `diffSourcePlugin`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { IconKey } from '../../../defaultSvgIcons.js';
	import { useCellValue, usePublisher } from '../../../realm/hooks.js';
	import { useTranslation } from '../../core/hooks.js';
	import { viewMode$, type ViewMode } from '../../core/index.js';
	import SingleChoiceToggleGroup from '../primitives/SingleChoiceToggleGroup.svelte';

	interface Props {
		children: Snippet;
		options?: ViewMode[];
		/** Toolbar contents to show in source mode. */
		SourceToolbar?: Snippet;
	}

	let { children, options = ['rich-text', 'diff', 'source'], SourceToolbar }: Props = $props();

	const viewMode = useCellValue(viewMode$);
	const changeViewMode = usePublisher(viewMode$);
	const t = useTranslation();

	const items = $derived.by(() => {
		const all: { title: string; icon: IconKey; value: ViewMode }[] = [
			{ title: t('toolbar.richText', 'Rich text'), icon: 'rich_text', value: 'rich-text' },
			{ title: t('toolbar.diffMode', 'Diff mode'), icon: 'difference', value: 'diff' },
			{ title: t('toolbar.source', 'Source mode'), icon: 'markdown', value: 'source' }
		];
		return all.filter((item) => options.includes(item.value));
	});
</script>

{#if viewMode.current === 'rich-text'}
	{@render children()}
{:else if viewMode.current === 'diff'}
	<span class="sd-toolbar-title-mode">{t('toolbar.diffMode', 'Diff mode')}</span>
{:else if SourceToolbar}
	{@render SourceToolbar()}
{:else}
	<span class="sd-toolbar-title-mode">{t('toolbar.source', 'Source mode')}</span>
{/if}

<div class="sd-diff-source-toggle-wrapper">
	<SingleChoiceToggleGroup
		class="sd-diff-source-toggle"
		ggClass="sd-gg-diff-source-toggle"
		value={viewMode.current}
		{items}
		onChange={(value) => {
			changeViewMode(value === '' ? 'rich-text' : value);
		}}
	/>
</div>
