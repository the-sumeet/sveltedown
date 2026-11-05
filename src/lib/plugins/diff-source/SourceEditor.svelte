<script lang="ts">
	import { EditorState } from '@codemirror/state';
	import { EditorView } from '@codemirror/view';
	import { useCellValue, useRealm } from '../../realm/hooks.js';
	import { markdownSourceEditorValue$, onBlur$, readOnly$ } from '../core/index.js';
	import { COMMON_STATE_CONFIG_EXTENSIONS } from './commonExtensions.js';
	import { cmExtensions$, getSourceEditorConfig, sourceEditorView$ } from './index.js';

	const realm = useRealm();
	const readOnly = useCellValue(readOnly$);
	const cmExtensions = useCellValue(cmExtensions$);

	let element: HTMLDivElement;

	$effect(() => {
		const extensions = [
			// custom extensions come first so that they can override the default ones
			...cmExtensions.current,
			...COMMON_STATE_CONFIG_EXTENSIONS,
			EditorView.updateListener.of(({ state }) => {
				realm.pub(markdownSourceEditorValue$, state.doc.toString());
			}),
			EditorView.focusChangeEffect.of((_, focused) => {
				if (!focused) realm.pub(onBlur$, new FocusEvent('blur'));
				return null;
			})
		];
		if (readOnly.current) extensions.push(EditorState.readOnly.of(true));
		const { extensions: pendingHistory = [], ...stateConfig } = getSourceEditorConfig(realm);
		const view = new EditorView({
			parent: element,
			state: EditorState.create({ ...stateConfig, extensions: [...extensions, pendingHistory] })
		});
		realm.pub(sourceEditorView$, { view, mode: 'source' });

		return () => {
			if (realm.getValue(sourceEditorView$)?.view === view) realm.pub(sourceEditorView$, null);
			view.destroy();
		};
	});
</script>

<div bind:this={element} class="cm-sourceView sveltedown-source-editor"></div>
