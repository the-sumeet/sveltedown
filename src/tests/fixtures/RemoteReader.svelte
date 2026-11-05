<script lang="ts">
	import { markdown$, useRemoteMDXEditorRealm } from '#lib';
	import { remote } from './RemoteRealmHarness.svelte';

	const realm = useRemoteMDXEditorRealm('main');

	$effect(() => {
		remote.realm = realm.current;
	});
</script>

<output aria-label="Remote markdown">{realm.current?.getValue(markdown$) ?? ''}</output>
