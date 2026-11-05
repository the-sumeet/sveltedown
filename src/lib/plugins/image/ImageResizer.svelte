<script lang="ts">
	import type { LexicalEditor } from 'lexical';

	interface Props {
		editor: LexicalEditor;
		image: () => HTMLElement | undefined;
		maxWidth?: number;
		onResizeStart: () => void;
		onResizeEnd: (width: 'inherit' | number, height: 'inherit' | number) => void;
	}

	let { editor, image, maxWidth, onResizeStart, onResizeEnd }: Props = $props();

	const Direction = { east: 1 << 0, north: 1 << 3, south: 1 << 1, west: 1 << 2 };
	const minWidth = 100;
	const minHeight = 100;

	const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

	let wrapper: HTMLDivElement;
	const userSelect = { priority: '', value: 'default' };
	const positioning = {
		currentHeight: 0,
		currentWidth: 0,
		direction: 0,
		isResizing: false,
		ratio: 0,
		startHeight: 0,
		startWidth: 0,
		startX: 0,
		startY: 0
	};

	// Find the maximum size, accounting for editor padding.
	const maxSize = () => {
		const root = editor.getRootElement();
		return {
			width: maxWidth ?? (root !== null ? root.getBoundingClientRect().width - 20 : 100),
			height: root !== null ? root.getBoundingClientRect().height - 20 : 100
		};
	};

	function setStartCursor(direction: number) {
		const ew = direction === Direction.east || direction === Direction.west;
		const ns = direction === Direction.north || direction === Direction.south;
		const nwse =
			(direction & Direction.north && direction & Direction.west) ||
			(direction & Direction.south && direction & Direction.east);
		const cursor = `${ew ? 'ew' : ns ? 'ns' : nwse ? 'nwse' : 'nesw'}-resize`;

		editor.getRootElement()?.style.setProperty('cursor', cursor, 'important');
		document.body.style.setProperty('cursor', cursor, 'important');
		userSelect.value = document.body.style.getPropertyValue('-webkit-user-select');
		userSelect.priority = document.body.style.getPropertyPriority('-webkit-user-select');
		document.body.style.setProperty('-webkit-user-select', 'none', 'important');
	}

	function setEndCursor() {
		editor.getRootElement()?.style.setProperty('cursor', 'text');
		document.body.style.setProperty('cursor', 'default');
		document.body.style.setProperty('-webkit-user-select', userSelect.value, userSelect.priority);
	}

	function handlePointerDown(event: PointerEvent, direction: number) {
		if (!editor.isEditable()) return;
		const element = image();
		if (!element) return;
		event.preventDefault();
		const { width, height } = element.getBoundingClientRect();
		Object.assign(positioning, {
			startWidth: width,
			startHeight: height,
			ratio: width / height,
			currentWidth: width,
			currentHeight: height,
			startX: event.clientX,
			startY: event.clientY,
			isResizing: true,
			direction
		});

		setStartCursor(direction);
		onResizeStart();

		wrapper.classList.add('sd-image-control-wrapper-resizing');
		element.style.height = `${height}px`;
		element.style.width = `${width}px`;

		document.addEventListener('pointermove', handlePointerMove);
		document.addEventListener('pointerup', handlePointerUp);
	}

	function handlePointerMove(event: PointerEvent) {
		const element = image();
		if (!element || !positioning.isResizing) return;
		const { width: maxWidthContainer, height: maxHeightContainer } = maxSize();
		const isHorizontal = positioning.direction & (Direction.east | Direction.west);
		const isVertical = positioning.direction & (Direction.south | Direction.north);

		if (isHorizontal && isVertical) {
			let diff = Math.floor(positioning.startX - event.clientX);
			diff = positioning.direction & Direction.east ? -diff : diff;
			const width = clamp(positioning.startWidth + diff, minWidth, maxWidthContainer);
			const height = width / positioning.ratio;
			element.style.width = `${width}px`;
			element.style.height = `${height}px`;
			positioning.currentHeight = height;
			positioning.currentWidth = width;
		} else if (isVertical) {
			let diff = Math.floor(positioning.startY - event.clientY);
			diff = positioning.direction & Direction.south ? -diff : diff;
			const height = clamp(positioning.startHeight + diff, minHeight, maxHeightContainer);
			element.style.height = `${height}px`;
			positioning.currentHeight = height;
		} else {
			let diff = Math.floor(positioning.startX - event.clientX);
			diff = positioning.direction & Direction.east ? -diff : diff;
			const width = clamp(positioning.startWidth + diff, minWidth, maxWidthContainer);
			element.style.width = `${width}px`;
			positioning.currentWidth = width;
		}
	}

	function handlePointerUp() {
		if (!image() || !positioning.isResizing) return;
		const width = positioning.currentWidth;
		const height = positioning.currentHeight;
		positioning.isResizing = false;
		wrapper.classList.remove('sd-image-control-wrapper-resizing');
		setEndCursor();
		onResizeEnd(width, height);
		document.removeEventListener('pointermove', handlePointerMove);
		document.removeEventListener('pointerup', handlePointerUp);
	}

	const handles = [
		['sd-image-resizer-n', Direction.north],
		['sd-image-resizer-ne', Direction.north | Direction.east],
		['sd-image-resizer-e', Direction.east],
		['sd-image-resizer-se', Direction.south | Direction.east],
		['sd-image-resizer-s', Direction.south],
		['sd-image-resizer-sw', Direction.south | Direction.west],
		['sd-image-resizer-w', Direction.west],
		['sd-image-resizer-nw', Direction.north | Direction.west]
	] as const;
</script>

<div bind:this={wrapper}>
	{#each handles as [className, direction] (className)}
		<div
			role="presentation"
			class={['sd-image-resizer', className]}
			onpointerdown={(event) => {
				handlePointerDown(event, direction);
			}}
		></div>
	{/each}
</div>
