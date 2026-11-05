<script lang="ts">
	import { useRealm } from '../../realm/hooks.js';
	import { getRemoteRealmsContext, remoteEditorId$ } from './index.js';

	const realm = useRealm();
	const remote = getRemoteRealmsContext();

	$effect(() => {
		const id = realm.getValue(remoteEditorId$);
		remote?.registerEditor(id, realm);
		return () => {
			remote?.unregisterEditor(id, realm);
		};
	});
</script>
