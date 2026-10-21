<script lang="ts">
	import { onMount } from 'svelte';
	import type { MarkdownEditorProps } from '../types.js';
	import { createEditor, type EditorController } from '../cm/setup.js';
	import '../styles/editor.css';

	let {
		value = $bindable(''),
		placeholder = '',
		readonly = false,
		class: className = '',
		onchange,
		imageSnippet,
		codeHeaderSnippet,
		extensions = []
	}: MarkdownEditorProps = $props();

	const snippets = $derived({ image: imageSnippet, codeHeader: codeHeaderSnippet });

	let container: HTMLDivElement;
	let editor: EditorController | undefined = $state();

	// CodeMirror needs the DOM, so it is only created in the browser.
	onMount(() => {
		const instance = createEditor({
			parent: container,
			doc: value,
			readonly,
			placeholder,
			extensions,
			snippets,
			onDocChange(doc) {
				// After this, `value` equals the doc, so the sync effect below is a no-op.
				value = doc;
				onchange?.(doc);
			}
		});
		editor = instance;
		return () => {
			editor = undefined;
			instance.destroy();
		};
	});

	// External `value` changes -> editor. `setDoc` skips the dispatch when nothing differs.
	$effect(() => {
		editor?.setDoc(value);
	});

	$effect(() => {
		editor?.setReadonly(readonly);
	});

	$effect(() => {
		editor?.setPlaceholder(placeholder);
	});

	$effect(() => {
		editor?.setExtensions(extensions);
	});

	$effect(() => {
		editor?.setSnippets(snippets);
	});
</script>

<div bind:this={container} class={['sveltedown', className]}></div>
