<script lang="ts">
	import type { CodeHeaderSnippetProps } from '../../types.js';

	let { language, code }: CodeHeaderSnippetProps = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
		} catch {
			return;
		}
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 1500);
	}
</script>

<span class="cm-md-code-lang">{language || 'text'}</span>
<button type="button" class="cm-md-code-copy" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
