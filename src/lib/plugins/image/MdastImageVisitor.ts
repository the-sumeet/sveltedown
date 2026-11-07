import type * as Mdast from 'mdast';
import type { MdastImportVisitor } from '../../importMarkdownToLexical.js';
import { $createImageNode } from './ImageNode.js';
import type { MdxJsxTextElement, MdxJsxFlowElement } from 'mdast-util-mdx';
import { $createParagraphNode, type RootNode } from 'lexical';

export const MdastImageVisitor: MdastImportVisitor<Mdast.Image> = {
	testNode: 'image',
	visitNode({ mdastNode, actions }) {
		actions.addAndStepInto(
			$createImageNode({
				src: mdastNode.url,
				altText: mdastNode.alt ?? '',
				title: mdastNode.title ?? ''
			})
		);
	}
};

/** An HTML width or height attribute ("300", "300px") in pixels, or undefined. */
function pixels(value: string | null) {
	const parsed = parseInt(value ?? '', 10);
	return Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed;
}

export const MdastHtmlImageVisitor: MdastImportVisitor<Mdast.Html> = {
	testNode: (node) => {
		return node.type === 'html' && node.value.trim().startsWith('<img');
	},
	visitNode({ mdastNode, lexicalParent }) {
		// A template's contents are inert: parsing the tag does not start loading the image.
		const template = document.createElement('template');
		template.innerHTML = mdastNode.value;
		const img = template.content.querySelector('img');

		if (!img) {
			throw new Error('Invalid HTML image');
		}

		// The attributes as written, not the properties: `img.src` is resolved against the page,
		// which would turn a relative `assets/photo.png` into an absolute URL on the next save.
		const src = img.getAttribute('src') ?? '';
		const altText = img.getAttribute('alt') ?? '';
		const title = img.getAttribute('title') ?? '';
		const width = pixels(img.getAttribute('width'));
		const height = pixels(img.getAttribute('height'));

		const image = $createImageNode({ src, altText, title, width, height });

		if (lexicalParent.getType() === 'root') {
			const paragraph = $createParagraphNode();
			paragraph.append(image);
			(lexicalParent as RootNode).append(paragraph);
		} else {
			(lexicalParent as RootNode).append(image);
		}
	}
};

function getAttributeValue(node: MdxJsxTextElement | MdxJsxFlowElement, attributeName: string) {
	const attribute = node.attributes.find(
		(a) => a.type === 'mdxJsxAttribute' && a.name === attributeName
	);
	if (!attribute) {
		return undefined;
	}
	return attribute.value as string | undefined;
}

export const MdastJsxImageVisitor: MdastImportVisitor<MdxJsxTextElement | MdxJsxFlowElement> = {
	testNode: (node) => {
		return (
			(node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement') &&
			node.name === 'img'
		);
	},
	visitNode({ mdastNode, lexicalParent }) {
		const src = getAttributeValue(mdastNode, 'src');
		if (!src) {
			return;
		}

		const altText = getAttributeValue(mdastNode, 'alt') ?? '';
		const title = getAttributeValue(mdastNode, 'title');
		const height = getAttributeValue(mdastNode, 'height');
		const width = getAttributeValue(mdastNode, 'width');

		const rest = mdastNode.attributes.filter((a) => {
			return (
				a.type === 'mdxJsxAttribute' && !['src', 'alt', 'title', 'height', 'width'].includes(a.name)
			);
		});

		const image = $createImageNode({
			src,
			altText,
			title,
			width: width ? parseInt(width, 10) : undefined,
			height: height ? parseInt(height, 10) : undefined,
			rest
		});

		if (lexicalParent.getType() === 'root') {
			const paragraph = $createParagraphNode();
			paragraph.append(image);
			(lexicalParent as RootNode).append(paragraph);
		} else {
			(lexicalParent as RootNode).append(image);
		}
	}
};
