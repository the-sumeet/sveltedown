import { mergeRegister } from '@lexical/utils';
import {
	$createNodeSelection,
	$getNodeByKey,
	$getSelection,
	$isNodeSelection,
	$setSelection,
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
	DRAGSTART_COMMAND,
	KEY_BACKSPACE_COMMAND,
	KEY_DELETE_COMMAND,
	KEY_ENTER_COMMAND,
	KEY_ESCAPE_COMMAND,
	type LexicalEditor
} from 'lexical';
import { $isImageNode } from './ImageNode.js';

const BROKEN_IMG_URI =
	'data:image/svg+xml;charset=utf-8,' +
	encodeURIComponent(`
    <svg id="imgLoadError" xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect x="0" y="0" width="100" height="100" fill="none" stroke="red" stroke-width="4" stroke-dasharray="4" />
      <text x="50" y="55" text-anchor="middle" font-size="20" fill="red">⚠️</text>
    </svg>
`);

const loaded = new Map<string, string>();
const loading = new Map<string, Promise<string>>();

/** Resolves to the URL to display: the source once it loaded, or an error image. */
export function loadImage(src: string): Promise<string> {
	const known = loaded.get(src);
	if (known) return Promise.resolve(known);
	let pending = loading.get(src);
	if (!pending) {
		pending = new Promise<string>((resolve) => {
			const image = new Image();
			const finish = (url: string) => {
				loaded.set(src, url);
				loading.delete(src);
				resolve(url);
			};
			image.onerror = () => {
				finish(BROKEN_IMG_URI);
			};
			image.onload = () => {
				finish(src);
			};
			image.src = src;
		});
		loading.set(src, pending);
	}
	return pending;
}

function $isSelectedNode(nodeKey: string): boolean {
	const node = $getNodeByKey(nodeKey);
	return node !== null && node.isSelected();
}

function setNodeSelected(editor: LexicalEditor, nodeKey: string, selected: boolean, clear = false) {
	editor.update(() => {
		let selection = $getSelection();
		if (clear || !$isNodeSelection(selection)) {
			selection = $createNodeSelection();
			$setSelection(selection);
		}
		if ($isNodeSelection(selection)) {
			if (selected) selection.add(nodeKey);
			else selection.delete(nodeKey);
		}
	});
}

/** The behaviour of an image in the editor: selecting it, and the keys that act on it. */
export function registerImageEditor(
	editor: LexicalEditor,
	options: {
		nodeKey: () => string;
		image: () => HTMLImageElement | undefined;
		button: () => HTMLElement | null;
		isResizing: () => boolean;
		onSelection: (selected: boolean, nodeSelection: boolean) => void;
	}
): () => void {
	const isSelected = () => {
		let selected = false;
		editor.getEditorState().read(() => {
			selected = $isSelectedNode(options.nodeKey());
		});
		return selected;
	};

	const onDelete = (event: KeyboardEvent) => {
		if (isSelected() && $isNodeSelection($getSelection())) {
			event.preventDefault();
			const node = $getNodeByKey(options.nodeKey());
			if ($isImageNode(node)) node.remove();
		}
		return false;
	};

	const report = () => {
		editor.getEditorState().read(() => {
			options.onSelection($isSelectedNode(options.nodeKey()), $isNodeSelection($getSelection()));
		});
	};
	report();

	return mergeRegister(
		editor.registerUpdateListener(report),
		editor.registerCommand<MouseEvent>(
			CLICK_COMMAND,
			(event) => {
				if (options.isResizing()) return true;
				if (event.target === options.image()) {
					if (event.shiftKey) {
						setNodeSelected(editor, options.nodeKey(), !isSelected());
					} else {
						setNodeSelected(editor, options.nodeKey(), true, true);
					}
					return true;
				}
				return false;
			},
			COMMAND_PRIORITY_LOW
		),
		editor.registerCommand(
			DRAGSTART_COMMAND,
			(event) => {
				if (event.target === options.image()) {
					// A workaround for Firefox to behave like other browsers.
					event.preventDefault();
					return true;
				}
				return false;
			},
			COMMAND_PRIORITY_LOW
		),
		editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
		editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
		editor.registerCommand(
			KEY_ENTER_COMMAND,
			(event) => {
				const selection = $getSelection();
				const button = options.button();
				if (
					isSelected() &&
					$isNodeSelection(selection) &&
					selection.getNodes().length === 1 &&
					button !== null &&
					button !== document.activeElement
				) {
					event?.preventDefault();
					button.focus();
					return true;
				}
				return false;
			},
			COMMAND_PRIORITY_LOW
		),
		editor.registerCommand<KeyboardEvent>(
			KEY_ESCAPE_COMMAND,
			(event) => {
				if (options.button() === event.target) {
					$setSelection(null);
					setNodeSelected(editor, options.nodeKey(), true);
					editor.getRootElement()?.focus();
					return true;
				}
				return false;
			},
			COMMAND_PRIORITY_LOW
		)
	);
}

/** Stores the size of the image after resizing it. */
export function setImageSize(
	editor: LexicalEditor,
	nodeKey: string,
	width: 'inherit' | number,
	height: 'inherit' | number
) {
	editor.update(() => {
		const node = $getNodeByKey(nodeKey);
		if ($isImageNode(node)) node.setWidthAndHeight(width, height);
	});
}

/** Removes the node. */
export function removeNode(editor: LexicalEditor, nodeKey: string) {
	editor.update(() => {
		$getNodeByKey(nodeKey)?.remove();
	});
}
