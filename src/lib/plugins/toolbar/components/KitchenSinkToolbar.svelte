<!--
	@component
	A toolbar with all toolbar components. Some buttons work only if the corresponding plugin is
	enabled. You'll probably want your own toolbar with only the buttons that you need.
-->
<script lang="ts">
	import type { EditorInFocus } from '../../core/index.js';
	import type { DirectiveNode } from '../../directives/DirectiveNode.js';
	import ConditionalContents from '../primitives/ConditionalContents.svelte';
	import Separator from '../primitives/Separator.svelte';
	import BlockTypeSelect from './BlockTypeSelect.svelte';
	import BoldItalicUnderlineToggles from './BoldItalicUnderlineToggles.svelte';
	import ChangeAdmonitionType from './ChangeAdmonitionType.svelte';
	import ChangeCodeMirrorLanguage from './ChangeCodeMirrorLanguage.svelte';
	import CodeToggle from './CodeToggle.svelte';
	import CreateLink from './CreateLink.svelte';
	import DiffSourceToggleWrapper from './DiffSourceToggleWrapper.svelte';
	import HighlightToggle from './HighlightToggle.svelte';
	import InsertAdmonition from './InsertAdmonition.svelte';
	import InsertCodeBlock from './InsertCodeBlock.svelte';
	import InsertFrontmatter from './InsertFrontmatter.svelte';
	import InsertImage from './InsertImage.svelte';
	import InsertTable from './InsertTable.svelte';
	import InsertThematicBreak from './InsertThematicBreak.svelte';
	import ListsToggle from './ListsToggle.svelte';
	import StrikeThroughSupSubToggles from './StrikeThroughSupSubToggles.svelte';
	import UndoRedo from './UndoRedo.svelte';

	function whenInAdmonition(editorInFocus: EditorInFocus | null) {
		const node = editorInFocus?.rootNode;
		if (node?.getType() !== 'directive') return false;
		const { name } = (node as DirectiveNode).getMdastNode();
		return ['note', 'tip', 'danger', 'info', 'caution'].includes(name);
	}
</script>

{#snippet changeLanguage()}
	<ChangeCodeMirrorLanguage />
{/snippet}
{#snippet changeAdmonition()}
	<ChangeAdmonitionType />
{/snippet}
{#snippet blockType()}
	<BlockTypeSelect />
{/snippet}
{#snippet insertAdmonition()}
	<Separator />
	<InsertAdmonition />
{/snippet}
{#snippet richText()}
	<UndoRedo />
	<Separator />
	<BoldItalicUnderlineToggles />
	<CodeToggle />
	<HighlightToggle />
	<Separator />
	<StrikeThroughSupSubToggles />
	<Separator />
	<ListsToggle />
	<Separator />
	<ConditionalContents
		options={[{ when: whenInAdmonition, contents: changeAdmonition }, { fallback: blockType }]}
	/>
	<Separator />
	<CreateLink />
	<InsertImage />
	<Separator />
	<InsertTable />
	<InsertThematicBreak />
	<Separator />
	<InsertCodeBlock />
	<ConditionalContents
		options={[{ when: (editor) => !whenInAdmonition(editor), contents: insertAdmonition }]}
	/>
	<Separator />
	<InsertFrontmatter />
{/snippet}

<DiffSourceToggleWrapper>
	<ConditionalContents
		options={[
			{ when: (editor) => editor?.editorType === 'codeblock', contents: changeLanguage },
			{ fallback: richText }
		]}
	/>
</DiffSourceToggleWrapper>
