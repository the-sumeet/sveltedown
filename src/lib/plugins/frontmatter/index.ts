import { realmPlugin } from '../../realmPlugin.js';
import type { Component } from 'svelte';
import {
	addExportVisitor$,
	addImportVisitor$,
	addLexicalNode$,
	addMdastExtension$,
	addSyntaxExtension$,
	addToMarkdownExtension$,
	createRootEditorSubscription$,
	rootEditor$
} from '../core/index.js';
import { Action, Cell, withLatestFrom } from '../../realm/index.js';
import {
	$getRoot,
	$getSelection,
	$isRangeSelection,
	$isTextNode,
	COMMAND_PRIORITY_CRITICAL,
	type ElementNode,
	KEY_DOWN_COMMAND,
	type LexicalEditor
} from 'lexical';
import { frontmatterFromMarkdown, frontmatterToMarkdown } from 'mdast-util-frontmatter';
import { frontmatter } from 'micromark-extension-frontmatter';
import { $createFrontmatterNode, $isFrontmatterNode, FrontmatterNode } from './FrontmatterNode.js';
import { LexicalFrontmatterVisitor } from './LexicalFrontmatterVisitor.js';
import { MdastFrontmatterVisitor } from './MdastFrontmatterVisitor.js';
import FrontmatterEditor, { type FrontmatterEditorProps } from './FrontmatterEditor.svelte';
export * from './FrontmatterNode.js';
export {
	default as FrontmatterEditor,
	type FrontmatterEditorProps
} from './FrontmatterEditor.svelte';

/**
 * The component used to edit frontmatter. Defaults to the key-value form.
 * @group Frontmatter
 */
export const frontmatterEditor$ = Cell<Component<FrontmatterEditorProps>>(FrontmatterEditor);

/**
 * Whether the frontmatter dialog is open.
 * @group Frontmatter
 */
export const frontmatterDialogOpen$ = Cell(false);

/**
 * Inserts a frontmatter node at the beginning of the markdown document.
 * @group Frontmatter
 */
export const insertFrontmatter$ = Action((r) => {
	r.sub(r.pipe(insertFrontmatter$, withLatestFrom(rootEditor$)), ([, rootEditor]) => {
		rootEditor?.update(() => {
			const firstItem = $getRoot().getFirstChild();
			if (!$isFrontmatterNode(firstItem)) {
				const fmNode = $createFrontmatterNode('"": ""');
				if (firstItem) {
					firstItem.insertBefore(fmNode);
				} else {
					$getRoot().append(fmNode);
				}
			}
		});
		r.pub(frontmatterDialogOpen$, true);
	});
});

/**
 * Removes the frontmatter node from the markdown document.
 * @group Frontmatter
 */
export const removeFrontmatter$ = Action((r) => {
	r.sub(r.pipe(removeFrontmatter$, withLatestFrom(rootEditor$)), ([, rootEditor]) => {
		rootEditor?.update(() => {
			const firstItem = $getRoot().getFirstChild();
			if ($isFrontmatterNode(firstItem)) {
				firstItem.remove();
			}
		});
		r.pub(frontmatterDialogOpen$, false);
	});
});

/**
 * Whether the markdown document has a frontmatter node.
 * @group Frontmatter
 */
export const hasFrontmatter$ = Cell(false, (r) => {
	r.pub(createRootEditorSubscription$, (rootEditor) => {
		return rootEditor.registerUpdateListener(({ editorState }) => {
			editorState.read(() => {
				r.pub(hasFrontmatter$, $isFrontmatterNode($getRoot().getFirstChild()));
			});
		});
	});
});

/**
 * A plugin that adds support for frontmatter.
 * @group Frontmatter
 */
export const frontmatterPlugin = realmPlugin<{
	/** Overrides the default key-value form. */
	FrontmatterEditor?: Component<FrontmatterEditorProps>;
}>({
	init: (realm, params) => {
		realm.pubIn({
			[frontmatterEditor$]: params?.FrontmatterEditor ?? FrontmatterEditor,
			[addMdastExtension$]: frontmatterFromMarkdown('yaml'),
			[addSyntaxExtension$]: frontmatter(),
			[addLexicalNode$]: FrontmatterNode,
			[addImportVisitor$]: MdastFrontmatterVisitor,
			[addExportVisitor$]: LexicalFrontmatterVisitor,
			[addToMarkdownExtension$]: frontmatterToMarkdown('yaml'),
			[createRootEditorSubscription$]: (editor: LexicalEditor) => {
				return editor.registerCommand<KeyboardEvent>(
					KEY_DOWN_COMMAND,
					(event) => {
						let shouldPrevent = false;

						editor.read(() => {
							const selection = $getSelection();

							if ($isRangeSelection(selection)) {
								if (
									selection.isCollapsed() &&
									selection.anchor.offset === 0 &&
									selection.focus.offset === 0 &&
									event.key === 'Backspace'
								) {
									let node = selection.getNodes()[0] as ElementNode | null;
									if ($isTextNode(node)) {
										node = node.getParent();
									}
									const prevSibling = node?.getPreviousSibling();
									if ($isFrontmatterNode(prevSibling)) {
										shouldPrevent = true;
										event.preventDefault();
									}
								} else {
									const firstNode = selection.getNodes()[0];
									if ($isFrontmatterNode(firstNode)) {
										const yaml = firstNode.getYaml();
										setTimeout(() => {
											editor.update(
												() => {
													const firstItem = $getRoot().getFirstChild();
													if (!$isFrontmatterNode(firstItem)) {
														$getRoot().splice(0, 0, [$createFrontmatterNode(yaml)]);
													}
												},
												{ discrete: true }
											);
										});
									}
								}
							}
						});

						if (shouldPrevent) {
							return true;
						}

						return false;
					},
					COMMAND_PRIORITY_CRITICAL
				);
			}
		});
	},
	update: (realm, params) => {
		realm.pub(frontmatterEditor$, params?.FrontmatterEditor ?? FrontmatterEditor);
	}
});
