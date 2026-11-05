<script lang="ts">
	import { insertFrontmatter$, useRealm } from '#lib';
	const realm = useRealm();
</script>

<button type="button" onclick={() => realm.pub(insertFrontmatter$)}>Edit frontmatter</button>
