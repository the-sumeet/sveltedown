<script lang="ts">
	import { useCellValue } from '../../realm/hooks.js';
	import type { FrontmatterEditorProps } from './FrontmatterEditor.svelte';
	import { frontmatterEditor$ } from './index.js';

	let { yaml, onChange }: FrontmatterEditorProps = $props();

	const Editor = useCellValue(frontmatterEditor$);
	const Current = $derived(Editor.current);
</script>

<Current {yaml} {onChange} />
