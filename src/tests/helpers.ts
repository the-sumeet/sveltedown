import { render } from 'vitest-browser-svelte';
import type { ComponentProps } from 'svelte';
import { MarkdownEditor, rootEditor$, type Realm, type RealmPlugin } from '#lib';
import type { LexicalEditor } from 'lexical';

type EditorProps = ComponentProps<typeof MarkdownEditor>;

/** Renders an editor, capturing its realm and root Lexical editor. */
export async function renderEditor(props: EditorProps = {}) {
	let realm!: Realm;
	const capture: RealmPlugin = {
		postInit: (r) => {
			realm = r;
		}
	};
	const result = await render(MarkdownEditor, {
		...props,
		plugins: [capture, ...(props.plugins ?? [])]
	});
	return {
		...result,
		realm,
		get rootEditor(): LexicalEditor {
			return realm.getValue(rootEditor$)!;
		}
	};
}

/** Imports markdown and exports it again. */
export async function roundTrip(markdown: string, plugins: RealmPlugin[] = []) {
	const { component } = await renderEditor({ markdown, plugins });
	return component.getMarkdown().trim();
}

/** Waits for an element to exist in the document. */
export async function waitForElement<T extends Element = HTMLElement>(
	selector: string,
	root: ParentNode = document
): Promise<T> {
	for (let attempt = 0; attempt < 100; attempt++) {
		const element = root.querySelector<T>(selector);
		if (element) return element;
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	throw new Error(`Timed out waiting for ${selector}`);
}
