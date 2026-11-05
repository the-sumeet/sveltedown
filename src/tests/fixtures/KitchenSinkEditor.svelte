<!-- An editor with every plugin and the full toolbar, for tests. -->
<script lang="ts">
	import {
		AdmonitionDirectiveDescriptor,
		KitchenSinkToolbar,
		MarkdownEditor,
		codeBlockPlugin,
		codeMirrorPlugin,
		diffSourcePlugin,
		directivesPlugin,
		frontmatterPlugin,
		headingsPlugin,
		imagePlugin,
		linkDialogPlugin,
		linkPlugin,
		listsPlugin,
		markdownShortcutPlugin,
		quotePlugin,
		tablePlugin,
		thematicBreakPlugin,
		toolbarPlugin,
		type Realm,
		type RealmPlugin
	} from '#lib';

	interface Props {
		markdown?: string;
		onRealm?: (realm: Realm) => void;
		extraPlugins?: RealmPlugin[];
		onchange?: (markdown: string) => void;
	}

	let { markdown = $bindable(''), onRealm, extraPlugins = [], onchange }: Props = $props();

	const plugins = [
		toolbarPlugin({ toolbarContents: toolbar }),
		listsPlugin(),
		quotePlugin(),
		headingsPlugin(),
		linkPlugin(),
		linkDialogPlugin(),
		imagePlugin(),
		tablePlugin(),
		thematicBreakPlugin(),
		frontmatterPlugin(),
		codeBlockPlugin({ defaultCodeBlockLanguage: 'ts' }),
		codeMirrorPlugin({ codeBlockLanguages: { ts: 'TypeScript', js: 'JavaScript' } }),
		directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
		diffSourcePlugin(),
		markdownShortcutPlugin(),
		{ postInit: (realm: Realm) => onRealm?.(realm) },
		...extraPlugins
	];
</script>

{#snippet toolbar()}
	<KitchenSinkToolbar />
{/snippet}

<MarkdownEditor bind:markdown {plugins} onchange={(value) => onchange?.(value)} />
