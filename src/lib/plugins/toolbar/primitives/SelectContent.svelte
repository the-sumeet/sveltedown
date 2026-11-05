<script lang="ts">
	import { Select as BitsSelect } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { useCellValue } from '../../../realm/hooks.js';
	import { editorRootElementRef$ } from '../../core/index.js';

	let {
		class: className = 'sd-select-container',
		children
	}: { class?: string; children: Snippet } = $props();

	const editorRootElementRef = useCellValue(editorRootElementRef$);
</script>

<BitsSelect.Portal to={editorRootElementRef.current?.current}>
	<BitsSelect.Content class={`${className} sveltedown-select-content`} sideOffset={4}>
		<BitsSelect.Viewport data-editor-dropdown={true}>
			{@render children()}
		</BitsSelect.Viewport>
	</BitsSelect.Content>
</BitsSelect.Portal>
