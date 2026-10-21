// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import svelte from '@astrojs/svelte';
import starlightLinksValidator from 'starlight-links-validator';

/** @param {string} path */
const lib = (path) => fileURLToPath(new URL(`../src/lib/${path}`, import.meta.url));

// GitHub Pages serves the site from a sub-path; the deploy workflow sets these.
const site = process.env.DOCS_SITE;
const base = process.env.DOCS_BASE;

export default defineConfig({
	site,
	base,
	integrations: [
		starlight({
			title: 'sveltedown',
			description: 'A live-preview Markdown editor for Svelte 5, built on CodeMirror 6.',
			customCss: ['./src/styles/custom.css'],
			// Content links are relative so they survive the GitHub Pages base path, which
			// Starlight doesn't add to Markdown links. The validator can't resolve relative
			// links; the docs smoke test crawls them under a base path instead.
			plugins: [starlightLinksValidator({ errorOnRelativeLinks: false })],
			sidebar: [
				{
					label: 'Getting started',
					items: ['getting-started/installation', 'getting-started/quick-start']
				},
				{
					label: 'Guides',
					items: [
						'guides/live-preview',
						'guides/code-blocks',
						'guides/tables',
						'guides/theming',
						'guides/custom-snippets',
						'guides/codemirror'
					]
				},
				{
					label: 'Reference',
					items: ['reference/props', 'reference/keyboard-shortcuts', 'reference/api']
				}
			]
		}),
		svelte()
	],
	vite: {
		resolve: {
			// Demos use the library's source, so they update while it is being developed.
			alias: [
				{ find: /^sveltedown\/editor\.css$/, replacement: lib('styles/editor.css') },
				{ find: /^sveltedown$/, replacement: lib('index.ts') }
			],
			// The library source sits outside this project and would otherwise resolve
			// the root project's copy of Svelte: two runtimes break mounting and reactivity.
			dedupe: ['svelte']
		}
	}
});
