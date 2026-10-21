<script lang="ts">
	import type { EditorView } from '@codemirror/view';
	import { toggleTask } from '../../cm/utils/tasks.js';

	let { checked, view }: { checked: boolean; view: EditorView } = $props();

	let input: HTMLInputElement;

	function onclick(event: MouseEvent) {
		// The native toggle matches the edit, and `checked` comes back through props.
		// Cancel it only when the document can't change (e.g. read-only).
		const spec = toggleTask(view.state, view.posAtDOM(input));
		if (spec) view.dispatch(spec);
		else event.preventDefault();
	}
</script>

<input
	bind:this={input}
	type="checkbox"
	class="cm-md-checkbox"
	aria-label={checked ? 'Mark task as not done' : 'Mark task as done'}
	{checked}
	{onclick}
/>
