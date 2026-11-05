<script lang="ts">
	import { DialogButton } from '#lib';
</script>

{#snippet video()}video{/snippet}
<DialogButton
	tooltipTitle="Insert YouTube video"
	dialogInputPlaceholder="Paste URL"
	submitButtonTitle="Insert video"
	onSubmit={() => undefined}
	buttonContent={video}
/>
