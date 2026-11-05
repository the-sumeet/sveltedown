<script lang="ts">
	import { Popover, Tooltip } from 'bits-ui';
	import { useCellValue, usePublisher } from '../../realm/hooks.js';
	import Icon from '../../ui/Icon.svelte';
	import { useTranslation } from '../core/hooks.js';
	import {
		activeEditor$,
		contentEditableWrapperElement$,
		editorRootElementRef$
	} from '../core/index.js';
	import { canCopyToClipboard, copyToClipboard } from './clipboard.js';
	import {
		cancelLinkEdit$,
		linkAutocompleteSuggestions$,
		linkDialogState$,
		onClickLinkCallback$,
		onWindowChange$,
		removeLink$,
		showLinkTitleField$,
		switchFromPreviewToLinkEdit$,
		updateLink$
	} from './index.js';
	import LinkEditForm from './LinkEditForm.svelte';

	const editorRootElementRef = useCellValue(editorRootElementRef$);
	const contentEditableWrapperElement = useCellValue(contentEditableWrapperElement$);
	const activeEditor = useCellValue(activeEditor$);
	const dialogState = useCellValue(linkDialogState$);
	const suggestions = useCellValue(linkAutocompleteSuggestions$);
	const onClickLinkCallback = useCellValue(onClickLinkCallback$);
	const showLinkTitleField = useCellValue(showLinkTitleField$);
	const publishWindowChange = usePublisher(onWindowChange$);
	const updateLink = usePublisher(updateLink$);
	const cancelLinkEdit = usePublisher(cancelLinkEdit$);
	const switchFromPreviewToLinkEdit = usePublisher(switchFromPreviewToLinkEdit$);
	const removeLink = usePublisher(removeLink$);
	const t = useTranslation();

	let anchor = $state<HTMLDivElement>();
	let copied = $state(false);

	$effect(() => {
		const scrollContainer = contentEditableWrapperElement.current?.closest(
			'.sveltedown-root-contenteditable'
		);
		const editor = activeEditor.current;
		const update = () => {
			editor?.getEditorState().read(() => {
				publishWindowChange(true);
			});
		};
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update);
		scrollContainer?.addEventListener('scroll', update);
		return () => {
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update);
			scrollContainer?.removeEventListener('scroll', update);
		};
	});

	const urlIsExternal = $derived(
		dialogState.current.type === 'preview' && dialogState.current.url.startsWith('http')
	);

	function copy(url: string) {
		const container = editorRootElementRef.current?.current ?? document.body;
		void copyToClipboard(url, container).then((success) => {
			if (!success) return;
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 1000);
		});
	}
</script>

{#if dialogState.current.type !== 'inactive'}
	{@const state = dialogState.current}
	{@const rect = state.rectangle}
	<Popover.Root open={true}>
		<div
			bind:this={anchor}
			data-visible={state.type === 'edit'}
			class="sd-link-dialog-anchor"
			style:top="{rect.top}px"
			style:left="{rect.left}px"
			style:width="{rect.width}px"
			style:height="{rect.height}px"
		></div>
		{#if anchor}
			<Popover.Portal to={editorRootElementRef.current?.current}>
				{#key state.linkNodeKey}
					<Popover.Content
						customAnchor={anchor}
						class="sd-link-dialog-popover-content"
						sideOffset={5}
						updatePositionStrategy="always"
						trapFocus={false}
						preventScroll={false}
						interactOutsideBehavior="ignore"
						escapeKeydownBehavior="ignore"
						onOpenAutoFocus={(event) => event.preventDefault()}
						onCloseAutoFocus={(event) => event.preventDefault()}
					>
						{#if state.type === 'edit'}
							<LinkEditForm
								url={state.url}
								title={state.title}
								text={state.text}
								onSubmit={updateLink}
								onCancel={() => cancelLinkEdit()}
								linkAutocompleteSuggestions={suggestions.current}
								showLinkTitleField={showLinkTitleField.current}
								showAnchorTextField={state.withAnchorText}
							/>
						{:else}
							<!-- Links in the document, not app routes. -->
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
							<a
								class="sd-link-dialog-preview-anchor"
								data-testid="link-dialog-preview"
								href={state.href ?? 'about:blank'}
								target={urlIsExternal ? '_blank' : undefined}
								rel={urlIsExternal ? 'noreferrer' : undefined}
								onclick={(event) => {
									const callback = onClickLinkCallback.current;
									if (callback !== null) {
										event.preventDefault();
										callback(state.url);
									}
								}}
								title={urlIsExternal
									? t('linkPreview.open', `Open {{url}} in new window`, { url: state.url })
									: state.url}
							>
								<span>{state.url}</span>
								{#if urlIsExternal}<Icon name="open_in_new" />{/if}
							</a>

							<button
								class="sd-action-button"
								title={t('linkPreview.edit', 'Edit link URL')}
								aria-label={t('linkPreview.edit', 'Edit link URL')}
								onclick={() => switchFromPreviewToLinkEdit()}
							>
								<Icon name="edit" />
							</button>
							{#if canCopyToClipboard()}
								<Tooltip.Provider>
									<Tooltip.Root open={copied}>
										<Tooltip.Trigger
											class="sd-action-button"
											title={t('linkPreview.copyToClipboard', 'Copy to clipboard')}
											aria-label={t('linkPreview.copyToClipboard', 'Copy to clipboard')}
											onclick={() => copy(state.url)}
										>
											<Icon name={copied ? 'check' : 'content_copy'} />
										</Tooltip.Trigger>
										<Tooltip.Portal to={editorRootElementRef.current?.current}>
											<Tooltip.Content class="sd-tooltip-content" sideOffset={5}>
												{t('linkPreview.copied', 'Copied!')}
												<Tooltip.Arrow />
											</Tooltip.Content>
										</Tooltip.Portal>
									</Tooltip.Root>
								</Tooltip.Provider>
							{/if}
							<button
								class="sd-action-button"
								title={t('linkPreview.remove', 'Remove link')}
								aria-label={t('linkPreview.remove', 'Remove link')}
								onclick={() => removeLink()}
							>
								<Icon name="link_off" />
							</button>
						{/if}
						<Popover.Arrow class="sd-popover-arrow" />
					</Popover.Content>
				{/key}
			</Popover.Portal>
		{/if}
	</Popover.Root>
{/if}
