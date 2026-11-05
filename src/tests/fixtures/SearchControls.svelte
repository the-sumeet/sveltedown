<script lang="ts">
	import {
		editorSearchTextNodeIndex$,
		searchOpen$,
		useCellValue,
		useEditorSearch,
		useRealm
	} from '#lib';

	const realm = useRealm();
	const search = useEditorSearch();
	const textNodeIndex = useCellValue(editorSearchTextNodeIndex$);
</script>

<div>
	<input
		aria-label="Search term"
		value={search.search}
		oninput={(event) => search.setSearch(event.currentTarget.value)}
	/>
	<output aria-label="Search total">{search.total}</output>
	<output aria-label="Search cursor">{search.cursor}</output>
	<output aria-label="Current match">{search.currentRange?.toString() ?? ''}</output>
	<output aria-label="Search open">{String(search.isSearchOpen)}</output>
	<output aria-label="Search indexed text">{textNodeIndex.current.allText}</output>
	<button type="button" onclick={search.openSearch}>Open search</button>
	<button type="button" onclick={search.closeSearch}>Close search</button>
	<button type="button" onclick={() => search.setIsSearchOpen(false)}>Close with setter</button>
	<button type="button" onclick={() => realm.pub(searchOpen$, false)}>Close with cell</button>
	<button type="button" onclick={search.next}>Next match</button>
	<button type="button" onclick={search.prev}>Previous match</button>
	<button type="button" onclick={() => search.replace('$&')}>Replace match</button>
	<button type="button" onclick={() => search.replaceAll('$&')}>Replace all</button>
	<button type="button" onclick={() => search.replaceAll('')}>Delete all</button>
	<button
		type="button"
		onclick={() => {
			if (search.currentRange) {
				search.scrollToRangeOrIndex(search.currentRange, {
					ignoreIfInView: false,
					behavior: 'auto'
				});
			}
		}}
	>
		Scroll supplied range
	</button>
	<button
		type="button"
		onclick={() => search.scrollToRangeOrIndex(1, { ignoreIfInView: true, behavior: 'smooth' })}
	>
		Scroll first index
	</button>
</div>
