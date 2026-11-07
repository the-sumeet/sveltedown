<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { untrack } from 'svelte';
	import { useCellValue, usePublisher } from '../../realm/hooks.js';
	import Icon from '../../ui/Icon.svelte';
	import { useTranslation } from '../core/hooks.js';
	import { editorRootElementRef$, readOnly$ } from '../core/index.js';
	import type { FrontmatterEditorProps } from './FrontmatterEditor.svelte';
	import {
		frontmatterEntriesEqual,
		frontmatterFieldValue,
		frontmatterValueText,
		isFrontmatterValueEditable,
		parseFrontmatter,
		serializeFrontmatter
	} from './frontmatterYaml.js';
	import { frontmatterDialogOpen$, removeFrontmatter$ } from './index.js';

	let { yaml, onChange }: FrontmatterEditorProps = $props();

	const readOnly = useCellValue(readOnly$);
	const editorRootElementRef = useCellValue(editorRootElementRef$);
	const open = useCellValue(frontmatterDialogOpen$);
	const setOpen = usePublisher(frontmatterDialogOpen$);
	const removeFrontmatter = usePublisher(removeFrontmatter$);
	const t = useTranslation();

	const { entries: initialEntries, invalid } = untrack(() => parseFrontmatter(yaml));

	interface Row {
		id: number;
		key: string;
		text: string;
		original: unknown;
		// Structured and multiline values stay read-only and are saved unchanged.
		preserved: boolean;
	}

	let nextId = 0;
	const toRow = (key: string, value: unknown): Row => ({
		id: nextId++,
		key,
		text: frontmatterValueText(value),
		original: value,
		preserved: !isFrontmatterValueEditable(value)
	});

	let rows = $state(initialEntries.map(({ key, value }) => toRow(key, value)));

	function submit() {
		if (readOnly.current || invalid) return;
		const updated = rows.map((row) => ({
			key: row.key,
			value: frontmatterFieldValue(row.text, row.original)
		}));
		if (frontmatterEntriesEqual(updated, initialEntries)) {
			setOpen(false);
			return;
		}
		if (updated.length === 0) {
			removeFrontmatter(undefined);
			setOpen(false);
			return;
		}
		onChange(serializeFrontmatter(updated));
		setOpen(false);
	}
</script>

<Dialog.Root open={open.current} onOpenChange={setOpen}>
	<Dialog.Portal to={editorRootElementRef.current?.current}>
		<Dialog.Overlay class="sd-dialog-overlay" />
		<Dialog.Content class="sd-large-dialog-content" data-editor-type="frontmatter">
			<Dialog.Title class="sd-dialog-title">
				{t('frontmatterEditor.title', 'Edit document frontmatter')}
			</Dialog.Title>
			<Dialog.Description class="sd-visually-hidden">
				{t(
					'frontmatterEditor.dialogDescription',
					'Add, edit, or remove the key-value entries of the document frontmatter.'
				)}
			</Dialog.Description>
			<form
				onsubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					submit();
				}}
				onreset={(event) => {
					event.stopPropagation();
					setOpen(false);
				}}
			>
				{#if invalid}
					<p role="alert">
						{t(
							'frontmatterEditor.invalidYaml',
							'This frontmatter cannot be edited as key-value fields. Edit the Markdown source instead.'
						)}
					</p>
				{/if}
				<table class="sd-property-editor-table">
					<colgroup><col /><col /><col /></colgroup>
					<thead>
						<tr>
							<th>{t('frontmatterEditor.key', 'Key')}</th>
							<th>{t('frontmatterEditor.value', 'Value')}</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row, index (row.id)}
							<tr>
								<td>
									<input
										class="sd-property-editor-input"
										aria-label={t('frontmatterEditor.key', 'Key')}
										required
										readonly={readOnly.current}
										bind:value={row.key}
									/>
								</td>
								<td>
									<input
										class="sd-property-editor-input"
										aria-label={t('frontmatterEditor.value', 'Value')}
										readonly={readOnly.current || row.preserved}
										bind:value={row.text}
									/>
								</td>
								<td>
									<button
										type="button"
										class="sd-icon-button"
										disabled={readOnly.current}
										onclick={() => {
											rows.splice(index, 1);
										}}
									>
										<Icon name="delete_big" />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td>
								<button
									type="button"
									class="sd-primary-button sd-small-button"
									disabled={readOnly.current || invalid}
									onclick={() => {
										rows.push(toRow('', ''));
									}}
								>
									{t('frontmatterEditor.addEntry', 'Add entry')}
								</button>
							</td>
						</tr>
					</tfoot>
				</table>
				<div style:display="flex" style:justify-content="flex-end" style:gap="var(--spacing-2)">
					<button type="submit" class="sd-primary-button" disabled={readOnly.current || invalid}>
						{t('dialogControls.save', 'Save')}
					</button>
					<button type="reset" class="sd-secondary-button">
						{t('dialogControls.cancel', 'Cancel')}
					</button>
				</div>
			</form>
			<Dialog.Close
				class="sd-dialog-close-button"
				aria-label={t('dialogControls.cancel', 'Cancel')}
			>
				<Icon name="close" />
			</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
