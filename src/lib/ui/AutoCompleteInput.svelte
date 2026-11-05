<!-- A text input with a suggestions list, used by the link, image and toolbar dialogs. -->
<script lang="ts">
	import Icon from './Icon.svelte';

	const MAX_SUGGESTIONS = 20;

	interface Props {
		value?: string;
		suggestions?: string[];
		placeholder?: string;
		id?: string;
		autofocus?: boolean;
		inputClass?: string;
		wrapperClass?: string;
		containerClass?: string;
		disabled?: boolean;
		name?: string;
		size?: number;
		onkeydown?: (event: KeyboardEvent, menuOpen: boolean) => void;
		oninput?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		suggestions = [],
		placeholder,
		id,
		autofocus = false,
		inputClass = 'sd-downshift-input',
		wrapperClass = 'sd-downshift-input-wrapper',
		containerClass = 'sd-downshift-autocomplete-container',
		disabled = false,
		name,
		size = 30,
		onkeydown,
		oninput
	}: Props = $props();

	let isOpen = $state(false);
	let highlighted = $state(-1);

	const items = $derived.by(() => {
		const query = value.toLowerCase();
		return suggestions
			.filter((suggestion) => suggestion.toLowerCase().includes(query))
			.slice(0, MAX_SUGGESTIONS);
	});
	const visible = $derived(isOpen && items.length > 0);
	const listId = $derived(`${id ?? name ?? 'sd-autocomplete'}-menu`);

	function choose(item: string) {
		value = item;
		oninput?.(item);
		isOpen = false;
		highlighted = -1;
	}

	function handleKeydown(event: KeyboardEvent) {
		onkeydown?.(event, visible);
		if (event.defaultPrevented) return;
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			if (suggestions.length === 0) return;
			event.preventDefault();
			isOpen = true;
			const step = event.key === 'ArrowDown' ? 1 : -1;
			highlighted = (highlighted + step + items.length) % Math.max(items.length, 1);
		} else if (event.key === 'Enter' && visible && highlighted >= 0) {
			event.preventDefault();
			choose(items[highlighted]);
		} else if (event.key === 'Escape' && visible) {
			event.preventDefault();
			event.stopPropagation();
			isOpen = false;
		}
	}
</script>

<div class={containerClass}>
	<div data-visible-dropdown={visible} class={wrapperClass}>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			{id}
			{name}
			{placeholder}
			{size}
			{disabled}
			{autofocus}
			class={inputClass}
			data-editor-dialog={true}
			role={suggestions.length > 0 ? 'combobox' : undefined}
			aria-autocomplete={suggestions.length > 0 ? 'list' : undefined}
			aria-expanded={suggestions.length > 0 ? visible : undefined}
			aria-controls={suggestions.length > 0 ? listId : undefined}
			bind:value
			oninput={() => {
				isOpen = suggestions.length > 0;
				highlighted = -1;
				oninput?.(value);
			}}
			onkeydown={handleKeydown}
			onblur={() => {
				isOpen = false;
			}}
		/>
		{#if suggestions.length > 0}
			<button
				type="button"
				aria-label="toggle menu"
				tabindex="-1"
				{disabled}
				onmousedown={(event) => event.preventDefault()}
				onclick={() => {
					isOpen = !isOpen;
				}}
			>
				<Icon name="arrow_drop_down" />
			</button>
		{/if}
	</div>
	{#if suggestions.length > 0}
		<div class="sd-downshift-autocomplete-container">
			<ul id={listId} role="listbox" data-visible={visible}>
				{#each items as item, index (`${item}${index}`)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<li
						role="option"
						aria-selected={item === value}
						data-selected={item === value}
						data-highlighted={highlighted === index}
						onmousedown={(event) => event.preventDefault()}
						onclick={() => {
							choose(item);
						}}
					>
						{item}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
