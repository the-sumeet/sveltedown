<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { onDestroy } from 'svelte';
	import { useCellValue, usePublisher } from '../../realm/hooks.js';
	import AutoCompleteInput from '../../ui/AutoCompleteInput.svelte';
	import { useTranslation } from '../core/hooks.js';
	import { editorRootElementRef$, readOnly$ } from '../core/index.js';
	import {
		allowSetImageDimensions$,
		closeImageDialog$,
		imageAutocompleteSuggestions$,
		imageDialogState$,
		imageUploadHandler$,
		imageUploadState$,
		saveImage$
	} from './index.js';

	const suggestions = useCellValue(imageAutocompleteSuggestions$);
	const dialogState = useCellValue(imageDialogState$);
	const editorRootElementRef = useCellValue(editorRootElementRef$);
	const uploadHandler = useCellValue(imageUploadHandler$);
	const allowDimensions = useCellValue(allowSetImageDimensions$);
	const uploadState = useCellValue(imageUploadState$);
	const readOnly = useCellValue(readOnly$);
	const saveImage = usePublisher(saveImage$);
	const closeImageDialog = usePublisher(closeImageDialog$);
	const t = useTranslation();

	const id = `sd-image-${Math.random().toString(36).slice(2)}`;

	let src = $state('');
	let title = $state('');
	let altText = $state('');
	let width = $state<number | undefined>();
	let height = $state<number | undefined>();
	let files = $state<FileList | undefined>();

	$effect(() => {
		const current = dialogState.current;
		const initial = current.type === 'editing' ? current.initialValues : {};
		src = initial.src ?? '';
		title = initial.title ?? '';
		altText = initial.altText ?? '';
		width = initial.width;
		height = initial.height;
		files = undefined;
	});

	onDestroy(() => {
		closeImageDialog(undefined);
	});

	const uploading = $derived(uploadState.current === 'uploading');
</script>

{#if dialogState.current.type !== 'inactive'}
	<Dialog.Root
		open={true}
		onOpenChange={(open) => {
			if (!open) closeImageDialog(undefined);
		}}
	>
		<Dialog.Portal to={editorRootElementRef.current?.current}>
			<Dialog.Overlay class="sd-dialog-overlay" />
			<Dialog.Content class="sd-dialog-content" onOpenAutoFocus={(event) => event.preventDefault()}>
				<Dialog.Title>{t('uploadImage.dialogTitle', 'Upload an image')}</Dialog.Title>
				<Dialog.Description class="sd-visually-hidden">
					{uploadHandler.current !== null
						? t(
								'uploadImage.dialogDescription',
								'Insert an image from a URL or upload one from your device.'
							)
						: t('uploadImage.dialogDescriptionNoUpload', 'Insert an image from a URL.')}
				</Dialog.Description>
				<form
					class="sd-multi-field-form"
					aria-busy={uploading}
					onsubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						saveImage({ src, title, altText, width, height, file: files });
					}}
				>
					<fieldset
						class="sd-multi-field-form"
						disabled={uploading || readOnly.current}
						style:border="0"
						style:padding="0"
						style:margin="0"
					>
						{#if uploadHandler.current !== null}
							<div class="sd-form-field">
								<label for={`${id}-file`}>
									{t('uploadImage.uploadInstructions', 'Upload an image from your device:')}
								</label>
								<input type="file" accept="image/*" id={`${id}-file`} bind:files />
							</div>
						{/if}

						<div class="sd-form-field">
							<label for={`${id}-src`}>
								{uploadHandler.current !== null
									? t('uploadImage.addViaUrlInstructions', 'Or add an image from an URL:')
									: t('uploadImage.addViaUrlInstructionsNoUpload', 'Add an image from an URL:')}
							</label>
							{#if suggestions.current.length > 0}
								<AutoCompleteInput
									id={`${id}-src`}
									bind:value={src}
									suggestions={suggestions.current}
									placeholder={t(
										'uploadImage.autoCompletePlaceholder',
										'Select or paste an image src'
									)}
								/>
							{:else}
								<input id={`${id}-src`} class="sd-text-input" size="40" bind:value={src} />
							{/if}
						</div>

						<div class="sd-form-field">
							<label for={`${id}-alt`}>{t('uploadImage.alt', 'Alt:')}</label>
							<input type="text" id={`${id}-alt`} class="sd-text-input" bind:value={altText} />
						</div>

						<div class="sd-form-field">
							<label for={`${id}-title`}>{t('uploadImage.title', 'Title:')}</label>
							<input type="text" id={`${id}-title`} class="sd-text-input" bind:value={title} />
						</div>

						{#if allowDimensions.current}
							<div class="sd-image-dimensions-container">
								<div class="sd-form-field">
									<label for={`${id}-width`}>{t('uploadImage.width', 'Width:')}</label>
									<input
										type="number"
										min="0"
										id={`${id}-width`}
										class="sd-text-input"
										bind:value={width}
									/>
								</div>
								<div class="sd-form-field">
									<label for={`${id}-height`}>{t('uploadImage.height', 'Height:')}</label>
									<input
										type="number"
										min="0"
										id={`${id}-height`}
										class="sd-text-input"
										bind:value={height}
									/>
								</div>
							</div>
						{/if}
					</fieldset>
					{#if uploading}
						<p role="status">
							<progress aria-label={t('uploadImage.uploading', 'Uploading image…')}></progress>
							{t('uploadImage.uploading', 'Uploading image…')}
						</p>
					{/if}
					{#if uploadState.current === 'error'}
						<p role="alert">
							{t('uploadImage.uploadError', 'Image upload failed. Please try again.')}
						</p>
					{/if}
					<div style:display="flex" style:justify-content="flex-end" style:gap="var(--spacing-2)">
						<button
							type="submit"
							disabled={uploading || readOnly.current}
							title={t('dialogControls.save', 'Save')}
							aria-label={t('dialogControls.save', 'Save')}
							class="sd-primary-button"
						>
							{t('dialogControls.save', 'Save')}
						</button>
						<Dialog.Close
							type="reset"
							title={t('dialogControls.cancel', 'Cancel')}
							aria-label={t('dialogControls.cancel', 'Cancel')}
							class="sd-secondary-button"
						>
							{t('dialogControls.cancel', 'Cancel')}
						</Dialog.Close>
					</div>
				</form>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{/if}
