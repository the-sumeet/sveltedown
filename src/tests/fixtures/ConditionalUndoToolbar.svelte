<script lang="ts">
	import { ConditionalContents, UndoRedo } from '#lib';
</script>

{#snippet code()}<span>Code toolbar</span>{/snippet}
{#snippet undo()}<UndoRedo />{/snippet}
<ConditionalContents
	options={[
		{ when: (focused) => focused?.editorType === 'codeblock', contents: code },
		{ fallback: undo }
	]}
/>
