<script lang="ts" module>
	import type { Realm } from '#lib';
	export const remote: { realm: Realm | undefined } = { realm: undefined };
</script>

<script lang="ts">
	import { MarkdownEditor, RemoteMDXEditorRealmProvider, remoteRealmPlugin } from '#lib';
	import RemoteReader from './RemoteReader.svelte';

	const plugins = [remoteRealmPlugin({ editorId: 'main' })];
</script>

<RemoteMDXEditorRealmProvider>
	<RemoteReader />
	<MarkdownEditor markdown="remote" {plugins} />
</RemoteMDXEditorRealmProvider>
