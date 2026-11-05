<!-- @component Inserts admonitions. Needs `AdmonitionDirectiveDescriptor` in the `directivesPlugin`. -->
<script lang="ts">
	import { ADMONITION_TYPES } from '../../../directive-editors/AdmonitionDirectiveDescriptor.js';
	import { usePublisher } from '../../../realm/hooks.js';
	import Icon from '../../../ui/Icon.svelte';
	import { useTranslation } from '../../core/hooks.js';
	import { insertDirective$ } from '../../directives/index.js';
	import ButtonOrDropdownButton from '../primitives/ButtonOrDropdownButton.svelte';
	import { admonitionLabelsMap } from './admonitionLabels.js';

	const insertDirective = usePublisher(insertDirective$);
	const t = useTranslation();
	const items = $derived.by(() => {
		const labels = admonitionLabelsMap(t);
		return ADMONITION_TYPES.map((type) => ({ value: type, label: labels[type] }));
	});
</script>

<ButtonOrDropdownButton
	title={t('toolbar.admonition', 'Insert Admonition')}
	onChoose={(name) => {
		insertDirective({ type: 'containerDirective', name });
	}}
	{items}
>
	<Icon name="admonition" />
</ButtonOrDropdownButton>
