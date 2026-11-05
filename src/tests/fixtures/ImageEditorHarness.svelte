<!-- An editor with the image toolbar button, in the root, a table, or an admonition. -->
<script lang="ts">
	import {
		AdmonitionDirectiveDescriptor,
		InsertImage,
		MarkdownEditor,
		directivesPlugin,
		imagePlugin,
		tablePlugin,
		toolbarPlugin,
		type ImageUploadHandler,
		type MarkdownEditorMethods,
		type Realm
	} from '#lib';

	interface Props {
		markdown: string;
		upload?: ImageUploadHandler;
		suggestions?: string[];
		editor?: MarkdownEditorMethods;
		onRealm?: (realm: Realm) => void;
		readonly?: boolean;
	}

	let {
		markdown,
		upload = null,
		suggestions = [],
		editor = $bindable(),
		onRealm,
		readonly = false
	}: Props = $props();

	// svelte-ignore state_referenced_locally
	const plugins = [
		{ init: (realm: Realm) => onRealm?.(realm) },
		imagePlugin({ imageUploadHandler: upload, imageAutocompleteSuggestions: suggestions }),
		tablePlugin(),
		directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
		toolbarPlugin({ toolbarContents: toolbar })
	];
</script>

{#snippet toolbar()}
	<InsertImage />
{/snippet}

<MarkdownEditor bind:this={editor} {markdown} {plugins} {readonly} />
