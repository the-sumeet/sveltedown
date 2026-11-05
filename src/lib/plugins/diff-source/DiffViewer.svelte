<script lang="ts">
	import { MergeView } from '@codemirror/merge';
	import { EditorState } from '@codemirror/state';
	import { EditorView } from '@codemirror/view';
	import { untrack } from 'svelte';
	import { useCellValue, useRealm } from '../../realm/hooks.js';
	import { markdownSourceEditorValue$, onBlur$, readOnly$ } from '../core/index.js';
	import { COMMON_STATE_CONFIG_EXTENSIONS } from './commonExtensions.js';
	import {
		cmExtensions$,
		diffMarkdown$,
		getSourceEditorConfig,
		readOnlyDiff$,
		sourceEditorView$
	} from './index.js';

	const realm = useRealm();
	const readOnly = useCellValue(readOnly$);
	const readOnlyDiff = useCellValue(readOnlyDiff$);
	const cmExtensions = useCellValue(cmExtensions$);

	let element: HTMLDivElement;
	let mergeView: MergeView | null = null;

	$effect(() =>
		realm.sub(diffMarkdown$, (next) => {
			const view = mergeView?.a;
			view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
		})
	);

	$effect(() => {
		const extensions = cmExtensions.current;
		const isReadOnly = untrack(() => readOnly.current || readOnlyDiff.current);
		const revertParams = isReadOnly
			? ({ renderRevertControl: undefined, revertControls: undefined } as const)
			: ({
					renderRevertControl: () => {
						const button = document.createElement('button');
						button.classList.add('cm-merge-revert');
						button.appendChild(document.createTextNode('⮕'));
						return button;
					},
					revertControls: 'a-to-b'
				} as const);

		const { extensions: pendingHistory = [], ...stateConfig } = getSourceEditorConfig(realm);
		const merge = new MergeView({
			...revertParams,
			parent: element,
			orientation: 'a-b',
			gutter: true,
			a: {
				doc: realm.getValue(diffMarkdown$),
				extensions: [
					...extensions,
					...COMMON_STATE_CONFIG_EXTENSIONS,
					EditorState.readOnly.of(true)
				]
			},
			b: {
				...stateConfig,
				extensions: [
					...extensions,
					...COMMON_STATE_CONFIG_EXTENSIONS,
					EditorState.readOnly.of(isReadOnly),
					pendingHistory,
					EditorView.updateListener.of(({ state }) => {
						realm.pub(markdownSourceEditorValue$, state.doc.toString());
					}),
					EditorView.focusChangeEffect.of((_, focused) => {
						if (!focused) realm.pub(onBlur$, new FocusEvent('blur'));
						return null;
					})
				]
			}
		});
		mergeView = merge;
		realm.pub(sourceEditorView$, { view: merge.b, mode: 'diff' });

		return () => {
			if (realm.getValue(sourceEditorView$)?.view === merge.b) realm.pub(sourceEditorView$, null);
			merge.destroy();
			mergeView = null;
		};
	});
</script>

<div bind:this={element} class="sveltedown-diff-editor"></div>
