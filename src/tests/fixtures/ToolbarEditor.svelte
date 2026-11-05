<!-- An editor whose toolbar shows a test component. -->
<script lang="ts">
	import type { Component, ComponentProps } from 'svelte';
	import {
		MarkdownEditor,
		toolbarPlugin,
		type MarkdownEditorMethods,
		type RealmPlugin
	} from '#lib';

	type Props = ComponentProps<typeof MarkdownEditor> & {
		toolbar?: Component;
		plugins?: RealmPlugin[];
		editor?: MarkdownEditorMethods;
	};

	let { toolbar, plugins = [], editor = $bindable(), ...rest }: Props = $props();

	const toolbarPlugins = $derived(toolbar ? [toolbarPlugin({ toolbarContents: contents })] : []);
	const allPlugins = $derived([...plugins, ...toolbarPlugins]);
</script>

{#snippet contents()}
	{#if toolbar}
		{@const Toolbar = toolbar}
		<Toolbar />
	{/if}
{/snippet}

<MarkdownEditor bind:this={editor} {...rest} plugins={allPlugins} />
