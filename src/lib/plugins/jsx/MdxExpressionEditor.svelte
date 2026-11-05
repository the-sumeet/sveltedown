<!-- The inline editor of a `{}` expression. -->
<script lang="ts">
	interface Props {
		value: string;
		onChange: (value: string) => void;
		onRemove: () => void;
	}

	let { value, onChange, onRemove }: Props = $props();
</script>

&#123;<span class="sd-input-sizer" data-value={value}>
	<input
		size="1"
		type="text"
		{value}
		onkeydown={(event) => {
			const current = event.currentTarget.value;
			if ((current === '' && event.key === 'Backspace') || event.key === 'Delete') {
				event.stopPropagation();
				event.stopImmediatePropagation();
				event.preventDefault();
				onRemove();
			}
		}}
		oninput={(event) => {
			const next = event.currentTarget.value;
			const sizer = event.currentTarget.parentElement;
			if (sizer) sizer.dataset.value = next;
			onChange(next);
		}}
	/>
</span>&#125;
