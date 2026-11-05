<script lang="ts" module>
	import type { LexicalEditor } from 'lexical';
	/** The last nested editor that rendered this child. */
	export const captured: { editor: LexicalEditor | null } = { editor: null };
</script>

<script lang="ts">
	import { useLexicalEditor } from '#lib';
	captured.editor = useLexicalEditor();
</script>
