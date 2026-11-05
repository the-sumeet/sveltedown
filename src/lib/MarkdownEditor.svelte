<!--
	@component
	A rich text Markdown editor. Features are enabled through `plugins`.
-->
<script lang="ts">
	import { onMount, untrack, type Component, type Snippet } from 'svelte';
	import type { EditorState, EditorThemeClasses } from 'lexical';
	import { defaultSvgIcons, type IconKey } from './defaultSvgIcons.js';
	import EditorInner from './EditorInner.svelte';
	import type { ToMarkdownOptions } from './exportMarkdownFromLexical.js';
	import { createMethods, type FocusOptions, type MarkdownEditorMethods } from './methods.js';
	import {
		corePlugin,
		setMarkdown$,
		type AdditionalLexicalNode,
		type Translation
	} from './plugins/core/index.js';
	import { Realm } from './realm/index.js';
	import type { RealmPlugin } from './realmPlugin.js';
	import { disposeRealmSession } from './realmSession.js';
	import './styles/editor.css';

	interface Props {
		/** The markdown to edit. Supports `bind:markdown`. */
		markdown?: string;
		/** The plugins to use in the editor. */
		plugins?: RealmPlugin[];
		/** Class of the root element, including the toolbar and popups. */
		class?: string;
		/** Class of the `contenteditable` element. Use it to style the content, like lists and quotes. */
		contentEditableClass?: string;
		/** The `spellcheck` value of the `contenteditable` element. */
		spellCheck?: boolean;
		/**
		 * Called when the markdown changes. `initialMarkdownNormalize` is true if the change comes
		 * from normalizing the initial markdown (for example, different bullet symbols).
		 */
		onchange?: (markdown: string, initialMarkdownNormalize: boolean) => void;
		/** Called when the markdown parser encounters an error. */
		onerror?: (payload: { error: string; source: string }) => void;
		/** Called when focus leaves the editor. */
		onblur?: (event: FocusEvent) => void;
		/** Options for generating markdown. See `mdast-util-to-markdown`. */
		toMarkdownOptions?: ToMarkdownOptions;
		/** Focus the editor when it is mounted. */
		autoFocus?: boolean | FocusOptions;
		/** Displayed when the editor is empty. */
		placeholder?: string | Snippet;
		/** Makes the editor read-only. To only display markdown, render it with a markdown library. */
		readonly?: boolean;
		/** Customizes the icons. Return a component, or a string of SVG markup. */
		iconComponentFor?: (name: IconKey) => Component | string;
		/** Set to true to stop processing HTML tags. */
		suppressHtmlProcessing?: boolean;
		/** A function compatible with the `t` function of i18next, to localize the editor. */
		translation?: Translation;
		/** Whether to trim the initial markdown. */
		trim?: boolean;
		/** A custom Lexical theme. */
		lexicalTheme?: EditorThemeClasses;
		/** The element to render popups in. Defaults to `document.body`. */
		overlayContainer?: HTMLElement | null;
		/** Disables the shared history, which some collaboration plugins require. */
		suppressSharedHistory?: boolean;
		/** The initial Lexical state. Pass null to skip importing the markdown. */
		editorState?: EditorState | null;
		/** Additional Lexical nodes to register. */
		additionalLexicalNodes?: AdditionalLexicalNode[];
		/** The Lexical editor namespace. */
		lexicalEditorNamespace?: string;
	}

	let {
		markdown = $bindable(''),
		plugins = [],
		class: className = '',
		contentEditableClass = '',
		spellCheck = true,
		onchange,
		onerror,
		onblur,
		toMarkdownOptions = { listItemIndent: 'one' },
		autoFocus = false,
		placeholder = '',
		readonly = false,
		iconComponentFor = (name) => defaultSvgIcons[name],
		suppressHtmlProcessing = false,
		translation = defaultTranslation,
		trim = true,
		lexicalTheme,
		overlayContainer,
		suppressSharedHistory = false,
		editorState,
		additionalLexicalNodes = [],
		lexicalEditorNamespace = 'Sveltedown'
	}: Props = $props();

	function defaultTranslation(
		_key: string,
		defaultValue: string,
		interpolations: Record<string, unknown> = {}
	) {
		let value = defaultValue;
		for (const [key, replacement] of Object.entries(interpolations)) {
			value = value.replaceAll(`{{${key}}}`, String(replacement));
		}
		return value;
	}

	// The last value that both the prop and the editor agree on.
	let syncedMarkdown = untrack(() => markdown);

	const handleChange = (value: string, initialMarkdownNormalize: boolean) => {
		syncedMarkdown = value;
		markdown = value;
		onchange?.(value, initialMarkdownNormalize);
	};

	const core = $derived(
		corePlugin({
			contentEditableClassName: contentEditableClass,
			spellCheck,
			initialMarkdown: untrack(() => markdown),
			onChange: handleChange,
			onBlur: (event) => onblur?.(event),
			onError: (payload) => onerror?.(payload),
			toMarkdownOptions,
			autoFocus,
			placeholder,
			readOnly: readonly,
			iconComponentFor,
			suppressHtmlProcessing,
			translation,
			trim,
			lexicalTheme,
			...(editorState !== undefined ? { editorState } : {}),
			suppressSharedHistory,
			additionalLexicalNodes,
			lexicalEditorNamespace
		})
	);

	let wrapper = $state<HTMLDivElement>();
	let realm = $state.raw<Realm | null>(null);

	// Methods called before the realm exists run once it does, in order.
	let methods: MarkdownEditorMethods | null = null;
	let lastMarkdown = untrack(() => (trim ? markdown.trim() : markdown));
	const pendingCalls: ((methods: MarkdownEditorMethods) => void)[] = [];

	function whenReady(call: (methods: MarkdownEditorMethods) => void) {
		if (methods) call(methods);
		else pendingCalls.push(call);
	}

	// The realm and Lexical need the DOM, so they only exist in the browser.
	onMount(() => {
		const instance = new Realm();
		const allPlugins = [untrack(() => core), ...untrack(() => plugins)];
		try {
			for (const plugin of allPlugins) plugin.init?.(instance);
			for (const plugin of allPlugins) plugin.postInit?.(instance);
		} catch (error) {
			try {
				disposeRealmSession(instance);
			} catch (cleanupError) {
				throw new AggregateError(
					[error, cleanupError],
					'Realm plugin initialization and cleanup both failed',
					{ cause: cleanupError }
				);
			}
			throw error;
		}
		realm = instance;
		methods = createMethods(instance);
		for (const call of pendingCalls.splice(0)) call(methods);

		return () => {
			if (methods) lastMarkdown = methods.getMarkdown();
			methods = null;
			realm = null;
			disposeRealmSession(instance);
		};
	});

	$effect(() => {
		const current = realm;
		const updates = [core, ...plugins];
		if (!current) return;
		untrack(() => {
			for (const plugin of updates) plugin.update?.(current);
		});
	});

	// An external change to `markdown` -> editor.
	$effect(() => {
		const next = markdown;
		const current = realm;
		if (!current || next === syncedMarkdown) return;
		syncedMarkdown = next;
		untrack(() => {
			current.pub(setMarkdown$, next);
		});
	});

	/** Gets the current markdown value. */
	export function getMarkdown(): string {
		return methods?.getMarkdown() ?? lastMarkdown;
	}

	/** Replaces the markdown value of the editor. */
	export function setMarkdown(value: string): void {
		lastMarkdown = value;
		whenReady((ready) => {
			ready.setMarkdown(value);
		});
	}

	/** Inserts markdown at the current cursor position. Focus the editor first if necessary. */
	export function insertMarkdown(value: string): void {
		whenReady((ready) => {
			ready.insertMarkdown(value);
		});
	}

	/** Moves focus into the editor. */
	export function focus(callback?: () => void, options?: FocusOptions): void {
		whenReady((ready) => {
			ready.focus(callback, options);
		});
	}

	/** Gets the HTML of the Lexical `contenteditable` element. */
	export function getContentEditableHTML(): string {
		return methods?.getContentEditableHTML() ?? '';
	}

	/**
	 * Gets the markdown of the selection in the active root or nested editor. Returns an empty
	 * string if there is no selection, if it's collapsed, or in source or diff mode.
	 */
	export function getSelectionMarkdown(): string {
		return methods?.getSelectionMarkdown() ?? '';
	}
</script>

<div bind:this={wrapper} class={['sveltedown', 'sd-editor-root', 'sd-editor-wrapper', className]}>
	{#if realm && wrapper}
		{#key realm}
			<EditorInner {realm} {wrapper} {className} {overlayContainer} />
		{/key}
	{/if}
</div>
