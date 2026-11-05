<!-- @component Inserts a table. Needs the `tablePlugin`. -->
<script lang="ts">
	import { useCellValue, usePublisher } from '../../../realm/hooks.js';
	import Icon from '../../../ui/Icon.svelte';
	import { useTranslation } from '../../core/hooks.js';
	import { editorInTable$ } from '../../core/index.js';
	import { insertTable$ } from '../../table/index.js';
	import ButtonWithTooltip from '../primitives/ButtonWithTooltip.svelte';

	const insertTable = usePublisher(insertTable$);
	// Markdown does not support a table inside a table cell.
	const inTable = useCellValue(editorInTable$);
	const t = useTranslation();
</script>

<ButtonWithTooltip
	title={t('toolbar.table', 'Insert Table')}
	disabled={inTable.current}
	onclick={() => insertTable({ rows: 3, columns: 3 })}
>
	<Icon name="table" />
</ButtonWithTooltip>
