<!-- A small search and replace UI, built with `useEditorSearch`. -->
<script lang="ts">
	import { useEditorSearch } from '@the-sumeet/sveltedown';

	const search = useEditorSearch();
	let replacement = $state('');

	$effect(() => {
		search.openSearch();
	});
</script>

<div class="search-box">
	<input
		aria-label="Search"
		placeholder="Search (regex)"
		value={search.search}
		oninput={(event) => search.setSearch(event.currentTarget.value)}
	/>
	<span class="search-count">{search.cursor} / {search.total}</span>
	<button type="button" onclick={search.prev} disabled={!search.total}>Previous</button>
	<button type="button" onclick={search.next} disabled={!search.total}>Next</button>
	<input aria-label="Replace with" placeholder="Replace with" bind:value={replacement} />
	<button type="button" onclick={() => search.replace(replacement)} disabled={!search.total}>
		Replace
	</button>
	<button type="button" onclick={() => search.replaceAll(replacement)} disabled={!search.total}>
		All
	</button>
</div>

<style>
	.search-box {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
	}

	input {
		width: 9rem;
		font: inherit;
	}

	.search-count {
		min-width: 3rem;
		text-align: center;
	}
</style>
