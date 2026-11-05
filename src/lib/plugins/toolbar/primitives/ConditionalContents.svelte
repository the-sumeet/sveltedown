<!-- @component Shows different contents based on the editor that is in focus. -->
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { EditorInFocus } from '../../core/index.js';

	/** An option of `ConditionalContents`, displayed if `when` returns true. */
	export interface ConditionalContentsOption {
		when: (editor: EditorInFocus | null) => boolean;
		contents: Snippet;
	}

	/** Displayed in `ConditionalContents` if none of the other options match. */
	export interface FallbackOption {
		fallback: Snippet;
	}
</script>

<script lang="ts">
	import { useCellValue } from '../../../realm/hooks.js';
	import { editorInFocus$ } from '../../core/index.js';

	let { options }: { options: (ConditionalContentsOption | FallbackOption)[] } = $props();

	const editorInFocus = useCellValue(editorInFocus$);
	const contents = $derived.by(() => {
		const option = options.find((candidate) =>
			'when' in candidate ? candidate.when(editorInFocus.current) : true
		);
		if (!option) return null;
		return 'when' in option ? option.contents : option.fallback;
	});
</script>

<div style:display="flex">
	{#if contents}
		{@render contents()}
	{/if}
</div>
