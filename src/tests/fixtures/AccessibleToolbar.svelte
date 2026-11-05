<script lang="ts">
	import { ButtonOrDropdownButton, ButtonWithTooltip, InsertImage } from '#lib';
	import YoutubeDialogButton from './YoutubeDialogButton.svelte';
</script>

<ButtonWithTooltip title="Insert code block">code</ButtonWithTooltip>
<ButtonOrDropdownButton
	title="Insert admonition"
	onChoose={() => undefined}
	items={[
		{ value: 'note', label: 'Note' },
		{ value: 'tip', label: 'Tip' }
	]}
>
	admonition
</ButtonOrDropdownButton>
<YoutubeDialogButton />
<InsertImage />
