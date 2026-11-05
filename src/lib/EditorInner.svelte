<!-- The client-only part of the editor, rendered once the realm exists. -->
<script lang="ts">
	import { getAllContexts, onMount, untrack, type Snippet } from 'svelte';
	import { setRealmContext, useCellValue } from './realm/hooks.js';
	import type { Realm } from './realm/index.js';
	import { attachEditorSurface, registerPlaceholder } from './plugins/core/editorSurface.js';
	import { setLexicalEditorContext, useTranslation } from './plugins/core/hooks.js';
	import {
		bottomAreaChildren$,
		composerChildren$,
		composerRegistrations$,
		contentEditableClassName$,
		contentEditableRef$,
		contentEditableWrapperElement$,
		editorRootElementRef$,
		editorWrapperElementRef$,
		editorWrappers$,
		placeholder$,
		rootEditor$,
		spellCheck$,
		topAreaChildren$
	} from './plugins/core/index.js';
	import RecursiveWrappers from './RecursiveWrappers.svelte';

	interface Props {
		realm: Realm;
		wrapper: HTMLDivElement;
		className: string;
		overlayContainer?: HTMLElement | null;
	}

	let { realm, wrapper, className, overlayContainer }: Props = $props();

	// The realm doesn't change for the lifetime of this component: the parent recreates it.
	const initialRealm = untrack(() => realm);
	setRealmContext(initialRealm);
	const rootEditor = initialRealm.getValue(rootEditor$);
	if (rootEditor) setLexicalEditorContext(rootEditor);
	const contexts = getAllContexts();

	const t = useTranslation();
	const contentEditableClassName = useCellValue(contentEditableClassName$);
	const spellCheck = useCellValue(spellCheck$);
	const placeholder = useCellValue(placeholder$);
	const topAreaChildren = useCellValue(topAreaChildren$);
	const bottomAreaChildren = useCellValue(bottomAreaChildren$);
	const composerChildren = useCellValue(composerChildren$);
	const editorWrappers = useCellValue(editorWrappers$);

	let wrapperElement = $state<HTMLDivElement>();
	let contentEditable = $state<HTMLDivElement>();
	let showPlaceholder = $state(false);

	// Popups render here, outside the editor, so they aren't clipped by it.
	$effect(() => {
		const popupContainer = document.createElement('div');
		popupContainer.classList.add(
			'sveltedown-popup-container',
			'sd-editor-root',
			'sd-popup-container',
			...className.trim().split(' ').filter(Boolean)
		);
		(overlayContainer ?? document.body).appendChild(popupContainer);
		realm.pub(editorRootElementRef$, { current: popupContainer });
		realm.pub(editorWrapperElementRef$, { current: wrapper });
		return () => {
			popupContainer.remove();
		};
	});

	$effect(() => {
		if (contentEditable) contentEditable.spellcheck = spellCheck.current;
	});

	onMount(() => {
		const editor = rootEditor;
		if (!editor || !contentEditable || !wrapperElement) return;

		realm.pub(contentEditableWrapperElement$, wrapperElement);
		realm.pub(contentEditableRef$, { current: contentEditable as HTMLDivElement });
		const detach = attachEditorSurface(editor, contentEditable, contexts, {
			ariaLabel: t('contentArea.editableMarkdown', 'editable markdown'),
			spellCheck: spellCheck.current
		});
		const unregisterPlaceholder = registerPlaceholder(editor, (visible) => {
			showPlaceholder = visible;
		});
		const unregisterBehaviour = realm
			.getValue(composerRegistrations$)
			.map((register) => register(editor, realm));

		return () => {
			for (const unregister of unregisterBehaviour) unregister();
			unregisterPlaceholder();
			detach();
			realm.pub(contentEditableRef$, null);
			realm.pub(contentEditableWrapperElement$, null);
		};
	});

	const isSnippet = (value: string | Snippet): value is Snippet => typeof value === 'function';
</script>

{#each topAreaChildren.current as Child, index (index)}
	<Child />
{/each}
<RecursiveWrappers wrappers={editorWrappers.current}>
	<div class="sd-root-content-editable-wrapper sveltedown-root-contenteditable">
		<div bind:this={wrapperElement} class="sveltedown-contenteditable-wrapper">
			<div
				bind:this={contentEditable}
				class={['sd-content-editable', contentEditableClassName.current]}
			></div>
		</div>
		{#if showPlaceholder}
			{@const content = placeholder.current}
			<div class={['sd-content-editable', 'sd-placeholder', contentEditableClassName.current]}>
				<p>
					{#if isSnippet(content)}
						{@render content()}
					{:else}
						{content}
					{/if}
				</p>
			</div>
		{/if}
	</div>
</RecursiveWrappers>
{#each composerChildren.current as Child, index (index)}
	<Child />
{/each}
{#each bottomAreaChildren.current as Child, index (index)}
	<Child />
{/each}
