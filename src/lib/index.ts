import type { ComponentProps } from 'svelte';
import type MarkdownEditorComponent from './MarkdownEditor.svelte';
import type BoldItalicUnderlineTogglesComponent from './plugins/toolbar/components/BoldItalicUnderlineToggles.svelte';
import type StrikeThroughSupSubTogglesComponent from './plugins/toolbar/components/StrikeThroughSupSubToggles.svelte';

export { default as MarkdownEditor } from './MarkdownEditor.svelte';
/** The props of `MarkdownEditor`. */
export type MarkdownEditorProps = ComponentProps<typeof MarkdownEditorComponent>;
export type { FocusOptions, MarkdownEditorMethods } from './methods.js';
export * from './defaultSvgIcons.js';

// state
export * from './realm/index.js';
export * from './realm/hooks.js';
export * from './realmPlugin.js';
export { registerRealmCleanup } from './realmSession.js';

// import/export
export * from './importMarkdownToLexical.js';
export * from './exportMarkdownFromLexical.js';

// core so that you can build your own plugins
export * from './plugins/core/index.js';
export * from './plugins/core/hooks.js';
export * from './plugins/core/decorators.svelte.js';
export * from './plugins/core/nestedEditorContext.js';
export { default as NestedLexicalEditor } from './plugins/core/NestedLexicalEditor.svelte';
export { default as NestedEditorsProvider } from './plugins/core/NestedEditorsProvider.svelte';
export { default as PropertyPopover } from './plugins/core/PropertyPopover.svelte';

// basics
export * from './plugins/headings/index.js';
export * from './plugins/thematic-break/index.js';
export * from './plugins/lists/index.js';
export * from './plugins/table/index.js';
export * from './plugins/link/index.js';
export * from './plugins/image/index.js';
export * from './plugins/frontmatter/index.js';
export * from './plugins/quote/index.js';
export * from './plugins/maxlength/index.js';

// JSX
export * from './plugins/jsx/index.js';
export {
	default as GenericJsxEditor,
	type GenericJsxEditorProps
} from './jsx-editors/GenericJsxEditor.svelte';

// code blocks
export * from './plugins/codemirror/index.js';
export { default as CodeMirrorEditor } from './plugins/codemirror/CodeMirrorEditor.svelte';
export * from './plugins/codeblock/index.js';

// directives
export * from './plugins/directives/index.js';
export * from './directive-editors/AdmonitionDirectiveDescriptor.js';
export { default as GenericDirectiveEditor } from './directive-editors/GenericDirectiveEditor.svelte';

// UI
export * from './plugins/link-dialog/index.js';
export * from './plugins/toolbar/index.js';
export * from './plugins/diff-source/index.js';
export * from './plugins/markdown-shortcut/index.js';
export * from './plugins/search/index.js';

// toolbar components
export { default as BlockTypeSelect } from './plugins/toolbar/components/BlockTypeSelect.svelte';
export { default as BoldItalicUnderlineToggles } from './plugins/toolbar/components/BoldItalicUnderlineToggles.svelte';
export { default as StrikeThroughSupSubToggles } from './plugins/toolbar/components/StrikeThroughSupSubToggles.svelte';
export { default as ChangeAdmonitionType } from './plugins/toolbar/components/ChangeAdmonitionType.svelte';
export { default as ChangeCodeMirrorLanguage } from './plugins/toolbar/components/ChangeCodeMirrorLanguage.svelte';
export { default as CodeToggle } from './plugins/toolbar/components/CodeToggle.svelte';
export { default as HighlightToggle } from './plugins/toolbar/components/HighlightToggle.svelte';
export { default as CreateLink } from './plugins/toolbar/components/CreateLink.svelte';
export { default as DiffSourceToggleWrapper } from './plugins/toolbar/components/DiffSourceToggleWrapper.svelte';
export { default as InsertAdmonition } from './plugins/toolbar/components/InsertAdmonition.svelte';
export { default as InsertCodeBlock } from './plugins/toolbar/components/InsertCodeBlock.svelte';
export { default as InsertFrontmatter } from './plugins/toolbar/components/InsertFrontmatter.svelte';
export { default as InsertImage } from './plugins/toolbar/components/InsertImage.svelte';
export { default as InsertTable } from './plugins/toolbar/components/InsertTable.svelte';
export { default as InsertThematicBreak } from './plugins/toolbar/components/InsertThematicBreak.svelte';
export { default as ListsToggle } from './plugins/toolbar/components/ListsToggle.svelte';
export { default as UndoRedo } from './plugins/toolbar/components/UndoRedo.svelte';
export { default as KitchenSinkToolbar } from './plugins/toolbar/components/KitchenSinkToolbar.svelte';
export type BoldItalicUnderlineTogglesProps = ComponentProps<
	typeof BoldItalicUnderlineTogglesComponent
>;
export type StrikeThroughSupSubTogglesProps = ComponentProps<
	typeof StrikeThroughSupSubTogglesComponent
>;

// build your own toolbar items
export { default as Button } from './plugins/toolbar/primitives/Button.svelte';
export { default as ButtonWithTooltip } from './plugins/toolbar/primitives/ButtonWithTooltip.svelte';
export { default as ButtonOrDropdownButton } from './plugins/toolbar/primitives/ButtonOrDropdownButton.svelte';
export {
	default as ConditionalContents,
	type ConditionalContentsOption,
	type FallbackOption
} from './plugins/toolbar/primitives/ConditionalContents.svelte';
export { default as DialogButton } from './plugins/toolbar/primitives/DialogButton.svelte';
export { default as MultipleChoiceToggleGroup } from './plugins/toolbar/primitives/MultipleChoiceToggleGroup.svelte';
export { default as Select } from './plugins/toolbar/primitives/Select.svelte';
export { default as Separator } from './plugins/toolbar/primitives/Separator.svelte';
export { default as SingleChoiceToggleGroup } from './plugins/toolbar/primitives/SingleChoiceToggleGroup.svelte';
export { default as TooltipWrap } from './plugins/toolbar/primitives/TooltipWrap.svelte';
export { default as Icon } from './ui/Icon.svelte';
export { default as Root } from './plugins/toolbar/primitives/Root.svelte';
export { default as ToggleSingleGroupWithItem } from './plugins/toolbar/primitives/ToggleSingleGroupWithItem.svelte';
export { default as SelectContent } from './plugins/toolbar/primitives/SelectContent.svelte';
export { default as SelectItem } from './plugins/toolbar/primitives/SelectItem.svelte';
export { default as AutoCompleteInput } from './ui/AutoCompleteInput.svelte';

// default editors and dialogs, to wrap or replace
export {
	default as EditImageToolbar,
	type EditImageToolbarProps
} from './plugins/image/EditImageToolbar.svelte';
export { default as ImageDialog } from './plugins/image/ImageDialog.svelte';
export { default as ImagePlaceholder } from './plugins/image/ImagePlaceholder.svelte';
export { default as LinkDialog } from './plugins/link-dialog/LinkDialog.svelte';
export { default as LinkEditForm } from './plugins/link-dialog/LinkEditForm.svelte';

// remote realm access
export * from './plugins/remote/index.js';
export { default as RemoteMDXEditorRealmProvider } from './plugins/remote/RemoteMDXEditorRealmProvider.svelte';

// helpers & utilities
export * from './utils/detectMac.js';
export * from './utils/fp.js';
export * from './utils/isPartOftheEditorUI.js';
export * from './utils/lexicalHelpers.js';
export * from './utils/makeHslTransparent.js';
export * from './utils/uuid4.js';
export * from './utils/voidEmitter.js';

export * from './FormatConstants.js';
export * from './styles/lexicalTheme.js';
