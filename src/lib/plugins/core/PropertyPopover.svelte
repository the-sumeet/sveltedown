<!-- @component Edits the properties of a node with a simple key/value form in a popover. -->
<script lang="ts">
	import { Popover } from 'bits-ui';
	import { untrack } from 'svelte';
	import { useCellValue } from '../../realm/hooks.js';
	import Icon from '../../ui/Icon.svelte';
	import { editorRootElementRef$ } from './index.js';

	interface Props {
		/** The properties to edit: names and initial values. */
		properties: Record<string, string>;
		/** Called when the user saves the property values. */
		onChange: (values: Record<string, string>) => void;
		/** The title to display in the popover. */
		title: string;
	}

	let { properties, onChange, title }: Props = $props();

	const editorRootElementRef = useCellValue(editorRootElementRef$);

	let open = $state(false);
	let values = $state(untrack(() => ({ ...properties })));
</script>

<Popover.Root bind:open>
	<Popover.Trigger class="sd-icon-button">
		<div><Icon name="settings" /></div>
	</Popover.Trigger>
	<Popover.Portal to={editorRootElementRef.current?.current}>
		<Popover.Content class="sd-popover-content" sideOffset={5} side="top">
			<span class="sd-popover-arrow"><Popover.Arrow /></span>
			<form
				onsubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					onChange({ ...values });
					open = false;
				}}
			>
				<h3 class="sd-property-panel-title">{title} Attributes</h3>
				<table class="sd-property-editor-table">
					<thead>
						<tr>
							<th class="sd-read-only-column-cell">Attribute</th>
							<th>Value</th>
						</tr>
					</thead>
					<tbody>
						{#each Object.keys(properties) as name (name)}
							<tr>
								<th class="sd-read-only-column-cell">{name}</th>
								<td>
									<input
										class="sd-property-editor-input"
										aria-label={name}
										bind:value={values[name]}
									/>
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td colspan="2">
								<div class="sd-buttons-footer">
									<button type="submit" class="sd-primary-button">Save</button>
									<button
										type="reset"
										class="sd-secondary-button"
										onclick={(event) => {
											event.preventDefault();
											values = { ...properties };
											open = false;
										}}
									>
										Cancel
									</button>
								</div>
							</td>
						</tr>
					</tfoot>
				</table>
			</form>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
