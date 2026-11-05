<!-- @component A toolbar button that opens a dialog with a text input, suggestions, and a submit button. -->
<script lang="ts">
	import { Dialog, Toolbar } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { useCellValue } from '../../../realm/hooks.js';
	import AutoCompleteInput from '../../../ui/AutoCompleteInput.svelte';
	import Icon from '../../../ui/Icon.svelte';
	import { useTranslation } from '../../core/hooks.js';
	import { editorRootElementRef$, readOnly$ } from '../../core/index.js';
	import TooltipWrap from './TooltipWrap.svelte';

	interface Props {
		/** The autocomplete suggestions to show in the dialog input. */
		autocompleteSuggestions?: string[];
		/** Called with the value of the text input when the dialog is submitted. */
		onSubmit: (value: string) => void;
		/** The title to show in the tooltip of the toolbar button. */
		tooltipTitle: string;
		/** The contents of the button. Usually an icon. */
		buttonContent?: Snippet;
		/** The placeholder text to show in the dialog input. */
		dialogInputPlaceholder: string;
		/** The title of the submit button. */
		submitButtonTitle: string;
	}

	let {
		autocompleteSuggestions = [],
		onSubmit,
		tooltipTitle,
		buttonContent,
		dialogInputPlaceholder,
		submitButtonTitle
	}: Props = $props();

	const editorRootElementRef = useCellValue(editorRootElementRef$);
	const readOnly = useCellValue(readOnly$);
	const t = useTranslation();

	let open = $state(false);
	let value = $state('');

	function submit() {
		onSubmit(value);
		value = '';
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Toolbar.Button
				{...props}
				aria-label={tooltipTitle}
				class="sd-toolbar-button"
				disabled={readOnly.current}
			>
				<TooltipWrap title={tooltipTitle}>{@render buttonContent?.()}</TooltipWrap>
			</Toolbar.Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Portal to={editorRootElementRef.current?.current}>
		<Dialog.Overlay class="sd-dialog-overlay" />
		<Dialog.Content class="sd-dialog-content">
			<Dialog.Title class="sd-visually-hidden">{tooltipTitle}</Dialog.Title>
			<Dialog.Description class="sd-visually-hidden">{dialogInputPlaceholder}</Dialog.Description>
			<form
				class="sd-dialog-form"
				onsubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					submit();
				}}
			>
				<AutoCompleteInput
					bind:value
					suggestions={autocompleteSuggestions}
					placeholder={dialogInputPlaceholder}
					autofocus
					containerClass="sd-link-dialog-input-container"
					wrapperClass="sd-link-dialog-input-wrapper"
					inputClass="sd-link-dialog-input"
				/>
				<button
					type="submit"
					title={submitButtonTitle}
					aria-label={submitButtonTitle}
					class="sd-action-button sd-primary-action-button"
				>
					<Icon name="check" />
				</button>
				<Dialog.Close aria-label={t('dialog.close', 'Close dialog')} class="sd-action-button">
					<Icon name="close" />
				</Dialog.Close>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
