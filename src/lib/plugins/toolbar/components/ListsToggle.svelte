<!-- @component Toggles between bulleted, numbered, and check lists. Needs the `listsPlugin`. -->
<script lang="ts">
	import { useCellValue, usePublisher } from '../../../realm/hooks.js';
	import { useTranslation } from '../../core/hooks.js';
	import { editorInTable$ } from '../../core/index.js';
	import { applyListType$, currentListType$ } from '../../lists/index.js';
	import SingleChoiceToggleGroup from '../primitives/SingleChoiceToggleGroup.svelte';

	type ListOption = 'bullet' | 'number' | 'check';
	let { options = ['bullet', 'number', 'check'] }: { options?: ListOption[] } = $props();

	const currentListType = useCellValue(currentListType$);
	const inTable = useCellValue(editorInTable$);
	const applyListType = usePublisher(applyListType$);
	const t = useTranslation();

	const icons = {
		bullet: 'format_list_bulleted',
		number: 'format_list_numbered',
		check: 'format_list_checked'
	} as const;
	const titles = $derived({
		bullet: t('toolbar.bulletedList', 'Bulleted list'),
		number: t('toolbar.numberedList', 'Numbered list'),
		check: t('toolbar.checkList', 'Check list')
	});
	const items = $derived(
		options.map((type) => ({ value: type, title: titles[type], icon: icons[type] }))
	);
</script>

<SingleChoiceToggleGroup
	value={(currentListType.current || '') as ListOption | ''}
	{items}
	onChange={applyListType}
	disabled={inTable.current}
/>
