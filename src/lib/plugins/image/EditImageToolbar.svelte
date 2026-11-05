<script lang="ts" module>
	/** The props of the toolbar shown on an image. */
	export interface EditImageToolbarProps {
		nodeKey: string;
		imageSource: string;
		initialImagePath: string | null;
		title: string;
		alt: string;
		width?: number | 'inherit';
		height?: number | 'inherit';
	}
</script>

<script lang="ts">
	import { useCellValue, usePublisher } from '../../realm/hooks.js';
	import Icon from '../../ui/Icon.svelte';
	import { useLexicalEditor, useTranslation } from '../core/hooks.js';
	import { activeEditor$, readOnly$ } from '../core/index.js';
	import { removeNode } from './imageEditor.js';
	import {
		disableImageSettingsButton$,
		openEditImageDialog$,
		parseImageDimension
	} from './index.js';

	let { nodeKey, imageSource, initialImagePath, title, alt, width, height }: EditImageToolbarProps =
		$props();

	const disableSettingsButton = useCellValue(disableImageSettingsButton$);
	const readOnly = useCellValue(readOnly$);
	const editor = useLexicalEditor();
	const openEditImageDialog = usePublisher(openEditImageDialog$);
	const setActiveEditor = usePublisher(activeEditor$);
	const t = useTranslation();
</script>

<div class="sd-edit-image-toolbar">
	<button
		class="sd-icon-button"
		type="button"
		title={t('imageEditor.deleteImage', 'Delete image')}
		disabled={readOnly.current}
		onclick={(event) => {
			event.preventDefault();
			removeNode(editor, nodeKey);
		}}
	>
		<Icon name="delete_small" />
	</button>
	{#if !disableSettingsButton.current}
		<button
			type="button"
			class="sd-icon-button sd-edit-image-button"
			title={t('imageEditor.editImage', 'Edit image')}
			disabled={readOnly.current}
			onclick={() => {
				// A toolbar button can be clicked before its nested editor is selected.
				setActiveEditor(editor);
				openEditImageDialog({
					nodeKey,
					initialValues: {
						src: initialImagePath ?? imageSource,
						title,
						altText: alt,
						width: parseImageDimension(width),
						height: parseImageDimension(height)
					}
				});
			}}
		>
			<Icon name="settings" />
		</button>
	{/if}
</div>
