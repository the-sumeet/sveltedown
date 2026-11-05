<!-- @component The default key-value frontmatter editor. -->
<script lang="ts" module>
	/** Props passed to the frontmatter editor component. */
	export interface FrontmatterEditorProps {
		/** The frontmatter contents, without the enclosing `---` delimiters. */
		yaml: string;
		/** Replaces the frontmatter contents, without the enclosing `---` delimiters. */
		onChange: (yaml: string) => void;
	}
</script>

<script lang="ts">
	import { useCellValue } from '../../realm/hooks.js';
	import FrontmatterForm from './FrontmatterForm.svelte';
	import { frontmatterDialogOpen$ } from './index.js';

	let { yaml, onChange }: FrontmatterEditorProps = $props();

	const open = useCellValue(frontmatterDialogOpen$);
</script>

{#if open.current}
	<!-- A fresh form on reopen, and when external edits replace the YAML. -->
	{#key yaml}
		<FrontmatterForm {yaml} {onChange} />
	{/key}
{/if}
