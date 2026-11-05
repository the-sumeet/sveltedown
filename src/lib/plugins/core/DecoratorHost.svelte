<script lang="ts">
	import type { DecoratorState } from './decorators.svelte.js';

	let { state: decoratorState }: { state: DecoratorState } = $props();
	const Decorator = $derived(decoratorState.component);
</script>

<Decorator {...decoratorState.props} />
