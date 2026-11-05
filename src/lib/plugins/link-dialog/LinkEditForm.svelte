<script lang="ts">
	import { untrack } from 'svelte';
	import AutoCompleteInput from '../../ui/AutoCompleteInput.svelte';
	import { useTranslation } from '../core/hooks.js';

	interface Props {
		url: string;
		title: string;
		text: string;
		onSubmit: (link: { url: string; title: string; text: string }) => void;
		onCancel: () => void;
		linkAutocompleteSuggestions: string[];
		showLinkTitleField: boolean;
		showAnchorTextField: boolean;
	}

	let props: Props = $props();
	const t = useTranslation();

	let url = $state(untrack(() => props.url));
	let title = $state(untrack(() => props.title));
	let text = $state(untrack(() => props.text));
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form
	class="sd-multi-field-form sd-link-dialog-edit-form"
	onsubmit={(event) => {
		event.preventDefault();
		event.stopPropagation();
		props.onSubmit({ url, title, text });
	}}
	onreset={(event) => {
		event.stopPropagation();
		props.onCancel();
	}}
	onkeydown={(event) => {
		if (event.key === 'Escape') {
			event.stopPropagation();
			props.onCancel();
		}
	}}
>
	<div class="sd-form-field">
		<label for="link-url">{t('createLink.url', 'URL')}</label>
		{#if props.linkAutocompleteSuggestions.length > 0}
			<AutoCompleteInput
				id="link-url"
				bind:value={url}
				suggestions={props.linkAutocompleteSuggestions}
				placeholder={t('createLink.urlPlaceholder', 'Select or paste an URL')}
				autofocus
			/>
		{:else}
			<!-- svelte-ignore a11y_autofocus -->
			<input id="link-url" class="sd-text-input" size="40" autofocus bind:value={url} />
		{/if}
	</div>

	{#if props.showAnchorTextField}
		<div class="sd-form-field">
			<label
				for="link-text"
				title={t('createLink.textTooltip', 'The text to be displayed for the link')}
			>
				{t('createLink.text', 'Anchor text')}
			</label>
			<input id="link-text" class="sd-text-input" size="40" bind:value={text} />
		</div>
	{/if}

	{#if props.showLinkTitleField}
		<div class="sd-form-field">
			<label
				for="link-title"
				title={t('createLink.titleTooltip', "The link's title attribute, shown on hover")}
			>
				{t('createLink.title', 'Link title')}
			</label>
			<input id="link-title" class="sd-text-input" size="40" bind:value={title} />
		</div>
	{/if}

	<div style:display="flex" style:justify-content="flex-end" style:gap="var(--spacing-2)">
		<button
			type="submit"
			title={t('createLink.saveTooltip', 'Set URL')}
			aria-label={t('createLink.saveTooltip', 'Set URL')}
			class="sd-primary-button"
		>
			{t('dialogControls.save', 'Save')}
		</button>
		<button
			type="reset"
			title={t('createLink.cancelTooltip', 'Cancel change')}
			aria-label={t('createLink.cancelTooltip', 'Cancel change')}
			class="sd-secondary-button"
		>
			{t('dialogControls.cancel', 'Cancel')}
		</button>
	</div>
</form>
