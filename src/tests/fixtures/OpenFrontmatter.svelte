<script lang="ts">
	import { frontmatterDialogOpen$, usePublisher } from '#lib';
	const open = usePublisher(frontmatterDialogOpen$);
</script>

<button onclick={() => open(true)}>Open frontmatter</button>
