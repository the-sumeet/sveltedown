<!--
	A live editor for the docs. Astro can't pass plugin functions to a hydrated component, so the
	demo builds its plugins from a named preset.
-->
<script lang="ts" module>
	export type Preset =
		| 'kitchen-sink'
		| 'basic'
		| 'toolbar'
		| 'links'
		| 'images'
		| 'tables'
		| 'code'
		| 'diff'
		| 'shortcuts'
		| 'directives'
		| 'jsx'
		| 'frontmatter'
		| 'search'
		| 'readonly';
</script>

<script lang="ts">
	import {
		AdmonitionDirectiveDescriptor,
		BlockTypeSelect,
		BoldItalicUnderlineToggles,
		ChangeCodeMirrorLanguage,
		CodeToggle,
		ConditionalContents,
		CreateLink,
		DiffSourceToggleWrapper,
		GenericDirectiveEditor,
		GenericJsxEditor,
		InsertAdmonition,
		InsertCodeBlock,
		InsertFrontmatter,
		InsertImage,
		InsertTable,
		InsertThematicBreak,
		KitchenSinkToolbar,
		ListsToggle,
		MarkdownEditor,
		Separator,
		UndoRedo,
		codeBlockPlugin,
		codeMirrorPlugin,
		diffSourcePlugin,
		directivesPlugin,
		frontmatterPlugin,
		headingsPlugin,
		imagePlugin,
		jsxPlugin,
		linkDialogPlugin,
		linkPlugin,
		listsPlugin,
		markdownShortcutPlugin,
		quotePlugin,
		searchPlugin,
		tablePlugin,
		thematicBreakPlugin,
		toolbarPlugin,
		type RealmPlugin
	} from '@the-sumeet/sveltedown';
	import SearchBox from './SearchBox.svelte';

	interface Props {
		markdown?: string;
		preset?: Preset;
		height?: string;
		showSource?: boolean;
	}

	let {
		markdown: initial = '',
		preset = 'kitchen-sink',
		height = '20rem',
		showSource = false
	}: Props = $props();

	// `%BASE%/` in a demo document becomes the site's base path, so images in `public/` resolve
	// when the docs are served from a sub-path (GitHub Pages).
	const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
	// svelte-ignore state_referenced_locally
	const seed = () => initial.replaceAll('%BASE%/', base);

	let markdown = $state(seed());
	// svelte-ignore state_referenced_locally
	let sourceOpen = $state(showSource);
	let key = $state(0);

	async function imageUploadHandler(file: File) {
		// The docs have no server, so uploaded images stay in the page as data URLs.
		return new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
			reader.readAsDataURL(file);
		});
	}

	const basics = () => [headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin()];
	const code = () => [
		codeBlockPlugin({ defaultCodeBlockLanguage: 'ts' }),
		codeMirrorPlugin({
			codeBlockLanguages: {
				ts: 'TypeScript',
				js: 'JavaScript',
				css: 'CSS',
				svelte: 'Svelte',
				'': 'Plain text'
			}
		})
	];

	function pluginsFor(name: Preset): RealmPlugin[] {
		switch (name) {
			case 'basic':
				return basics();
			case 'toolbar':
				return [
					...basics(),
					linkPlugin(),
					linkDialogPlugin(),
					toolbarPlugin({ toolbarContents: basicToolbar })
				];
			case 'links':
				return [
					linkPlugin(),
					linkDialogPlugin({
						linkAutocompleteSuggestions: ['https://svelte.dev', 'https://lexical.dev']
					}),
					toolbarPlugin({ toolbarContents: linkToolbar })
				];
			case 'images':
				return [
					imagePlugin({ imageUploadHandler }),
					toolbarPlugin({ toolbarContents: imageToolbar })
				];
			case 'tables':
				return [tablePlugin(), linkPlugin(), toolbarPlugin({ toolbarContents: tableToolbar })];
			case 'code':
				return [...code(), toolbarPlugin({ toolbarContents: codeToolbar })];
			case 'diff':
				return [
					...basics(),
					...code(),
					tablePlugin(),
					linkPlugin(),
					diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: seed() }),
					toolbarPlugin({ toolbarContents: diffToolbar })
				];
			case 'shortcuts':
				return [...basics(), linkPlugin(), ...code(), markdownShortcutPlugin()];
			case 'directives':
				return [
					...basics(),
					directivesPlugin({
						directiveDescriptors: [
							AdmonitionDirectiveDescriptor,
							{
								name: 'youtube',
								type: 'leafDirective',
								attributes: ['id'],
								hasChildren: false,
								testNode: (node) => node.name === 'youtube',
								Editor: GenericDirectiveEditor
							}
						]
					}),
					toolbarPlugin({ toolbarContents: directiveToolbar })
				];
			case 'jsx':
				return [
					...basics(),
					jsxPlugin({
						jsxComponentDescriptors: [
							{
								name: 'Callout',
								kind: 'flow',
								source: './components',
								props: [{ name: 'type', type: 'string' }],
								hasChildren: true,
								Editor: GenericJsxEditor
							},
							{
								name: 'Badge',
								kind: 'text',
								source: './components',
								props: [{ name: 'color', type: 'string' }],
								hasChildren: true,
								Editor: GenericJsxEditor
							}
						]
					})
				];
			case 'frontmatter':
				return [
					...basics(),
					frontmatterPlugin(),
					toolbarPlugin({ toolbarContents: frontmatterToolbar })
				];
			case 'search':
				return [...basics(), searchPlugin(), toolbarPlugin({ toolbarContents: searchToolbar })];
			case 'readonly':
				return [...basics(), linkPlugin(), tablePlugin(), ...code()];
			default:
				return [
					...basics(),
					linkPlugin(),
					linkDialogPlugin(),
					imagePlugin({ imageUploadHandler }),
					tablePlugin(),
					frontmatterPlugin(),
					...code(),
					directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
					diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: seed() }),
					markdownShortcutPlugin(),
					toolbarPlugin({ toolbarContents: kitchenSink })
				];
		}
	}

	// svelte-ignore state_referenced_locally
	const plugins = pluginsFor(preset);
</script>

{#snippet kitchenSink()}
	<KitchenSinkToolbar />
{/snippet}
{#snippet basicToolbar()}
	<UndoRedo />
	<Separator />
	<BoldItalicUnderlineToggles />
	<CodeToggle />
	<Separator />
	<BlockTypeSelect />
	<ListsToggle />
	<CreateLink />
	<InsertThematicBreak />
{/snippet}
{#snippet linkToolbar()}
	<BoldItalicUnderlineToggles />
	<CreateLink />
{/snippet}
{#snippet imageToolbar()}
	<InsertImage />
{/snippet}
{#snippet tableToolbar()}
	<UndoRedo />
	<InsertTable />
{/snippet}
{#snippet language()}
	<ChangeCodeMirrorLanguage />
{/snippet}
{#snippet codeFallback()}
	<UndoRedo />
	<InsertCodeBlock />
{/snippet}
{#snippet codeToolbar()}
	<ConditionalContents
		options={[
			{ when: (editor) => editor?.editorType === 'codeblock', contents: language },
			{ fallback: codeFallback }
		]}
	/>
{/snippet}
{#snippet diffToolbar()}
	<DiffSourceToggleWrapper>
		<UndoRedo />
		<BoldItalicUnderlineToggles />
	</DiffSourceToggleWrapper>
{/snippet}
{#snippet directiveToolbar()}
	<InsertAdmonition />
{/snippet}
{#snippet frontmatterToolbar()}
	<InsertFrontmatter />
{/snippet}
{#snippet searchToolbar()}
	<SearchBox />
{/snippet}

<div class="demo not-content">
	<div class="demo-editor" style:--demo-height={height}>
		{#key key}
			<MarkdownEditor
				bind:markdown
				{plugins}
				readonly={preset === 'readonly'}
				placeholder="Start writing…"
			/>
		{/key}
	</div>
	<div class="demo-bar">
		<button type="button" onclick={() => (sourceOpen = !sourceOpen)} aria-expanded={sourceOpen}>
			{sourceOpen ? 'Hide' : 'Show'} Markdown
		</button>
		<button
			type="button"
			onclick={() => {
				markdown = seed();
				key++;
			}}
		>
			Reset
		</button>
	</div>
	{#if sourceOpen}
		<textarea bind:value={markdown} aria-label="Markdown source" spellcheck="false"></textarea>
	{/if}
</div>
