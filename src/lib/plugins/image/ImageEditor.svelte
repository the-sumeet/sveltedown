<script lang="ts">
	import type { MdxJsxAttribute, MdxJsxExpressionAttribute } from 'mdast-util-mdx-jsx';
	import { useCellValue } from '../../realm/hooks.js';
	import { useLexicalEditor } from '../core/hooks.js';
	import { readOnly$ } from '../core/index.js';
	import { loadImage, registerImageEditor, setImageSize } from './imageEditor.js';
	import {
		allowSetImageDimensions$,
		disableImageResize$,
		editImageToolbarComponent$,
		imagePlaceholder$,
		imagePreviewHandler$
	} from './index.js';
	import ImageResizer from './ImageResizer.svelte';

	interface Props {
		nodeKey: string;
		src: string;
		alt?: string;
		title?: string;
		width: number | 'inherit';
		height: number | 'inherit';
		rest: (MdxJsxAttribute | MdxJsxExpressionAttribute)[];
	}

	let { nodeKey, src, alt, title, width, height, rest }: Props = $props();

	const editor = useLexicalEditor();
	const Placeholder = useCellValue(imagePlaceholder$);
	const disableResize = useCellValue(disableImageResize$);
	const allowDimensions = useCellValue(allowSetImageDimensions$);
	const previewHandler = useCellValue(imagePreviewHandler$);
	const readOnly = useCellValue(readOnly$);
	const EditImageToolbar = useCellValue(editImageToolbarComponent$);

	let imageElement = $state<HTMLImageElement>();
	let wrapperElement = $state<HTMLDivElement>();
	let isSelected = $state(false);
	let hasNodeSelection = $state(false);
	let isResizing = $state(false);
	let imageSource = $state<string | null>(null);
	let initialImagePath = $state<string | null>(null);
	let displaySource = $state<string | null>(null);

	$effect(() => {
		const handler = previewHandler.current;
		const current = src;
		if (!handler) {
			imageSource = current;
			return;
		}
		initialImagePath ??= current;
		let cancelled = false;
		handler(current).then(
			(updated) => {
				if (!cancelled) imageSource = updated;
			},
			(error: unknown) => {
				console.error(error);
			}
		);
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const source = imageSource;
		if (source === null) return;
		let cancelled = false;
		void loadImage(source).then((url) => {
			if (!cancelled) displaySource = url;
		});
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!allowDimensions.current || !imageElement) return;
		const sync = (key: 'width' | 'height', value: number | 'inherit') => {
			if (typeof value === 'number') imageElement!.style[key] = `${value}px`;
			else imageElement!.style.removeProperty(key);
		};
		sync('width', width);
		sync('height', height);
	});

	$effect(() =>
		registerImageEditor(editor, {
			nodeKey: () => nodeKey,
			image: () => imageElement,
			button: () => wrapperElement?.querySelector<HTMLElement>('.sd-edit-image-button') ?? null,
			isResizing: () => isResizing,
			onSelection: (selected, nodeSelection) => {
				isSelected = selected;
				hasNodeSelection = nodeSelection;
			}
		})
	);

	const passedClassName = $derived.by(() => {
		const attribute = rest.find(
			(attr) =>
				attr.type === 'mdxJsxAttribute' && (attr.name === 'class' || attr.name === 'className')
		);
		return attribute ? (attribute.value as string) : null;
	});

	const dimension = (value: number | 'inherit') => (value === 'inherit' ? undefined : value);
</script>

{#if imageSource !== null}
	{#if displaySource === null}
		{#if Placeholder.current}
			{@const ImagePlaceholder = Placeholder.current}
			<ImagePlaceholder />
		{/if}
	{:else}
		{@const Toolbar = EditImageToolbar.current}
		<div bind:this={wrapperElement} class="sd-image-wrapper" data-editor-block-type="image">
			<div draggable={hasNodeSelection}>
				<img
					bind:this={imageElement}
					class={[isSelected && 'sd-focused-image', passedClassName]}
					src={displaySource}
					title={title ?? ''}
					alt={alt ?? ''}
					draggable="false"
					width={dimension(width)}
					height={dimension(height)}
				/>
			</div>
			{#if hasNodeSelection && isSelected && !disableResize.current}
				<ImageResizer
					{editor}
					image={() => imageElement}
					onResizeStart={() => {
						isResizing = true;
					}}
					onResizeEnd={(nextWidth, nextHeight) => {
						// Delay hiding the resize bars for the click case.
						setTimeout(() => {
							isResizing = false;
						}, 200);
						setImageSize(editor, nodeKey, nextWidth, nextHeight);
					}}
				/>
			{/if}
			{#if !readOnly.current}
				<Toolbar
					{nodeKey}
					{imageSource}
					{initialImagePath}
					title={title ?? ''}
					alt={alt ?? ''}
					{width}
					{height}
				/>
			{/if}
		</div>
	{/if}
{/if}
