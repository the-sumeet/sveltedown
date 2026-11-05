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
			description: 'A rich text Markdown editor for Svelte 5, built on Lexical.',
			customCss: ['./src/styles/custom.css'],
			// Content links are relative so they survive the GitHub Pages base path, which
			// Starlight doesn't add to Markdown links. The validator can't resolve relative
			// links; the docs smoke test crawls them under a base path instead.
			plugins: [starlightLinksValidator({ errorOnRelativeLinks: false })],
			sidebar: [
				{
					label: 'Getting started',
					items: [
						'getting-started/installation',
						'getting-started/quick-start',
						'guides/migrating'
					]
				},
				{
					label: 'Features',
					items: [
						'guides/basic-formatting',
						'guides/toolbar',
						'guides/links',
						'guides/images',
						'guides/tables',
						'guides/code-blocks',
						'guides/diff-source',
						'guides/markdown-shortcuts',
						'guides/directives',
						'guides/jsx',
						'guides/front-matter',
						'guides/search-replace'
					]
				},
				{
					label: 'Customizing',
					items: [
						'guides/theming',
						'guides/html',
						'guides/error-handling',
						'guides/i18n',
						'guides/extending'
					]
				},
				{
					label: 'Reference',
					items: ['reference/props', 'reference/plugins']
				}
			]
		}),
		svelte()
	],
	vite: {
		resolve: {
			// Demos use the library's source, so they update while it is being developed.
			alias: [
				{ find: /^@the-sumeet\/sveltedown\/editor\.css$/, replacement: lib('styles/editor.css') },
				{ find: /^@the-sumeet\/sveltedown$/, replacement: lib('index.ts') }
			],
			// The library source sits outside this project and would otherwise resolve
			// the root project's copy of Svelte: two runtimes break mounting and reactivity.
			dedupe: ['svelte'],
			// The library's Svelte dependencies ship .svelte files, which Node can't load directly.
			noExternal: ['bits-ui', 'svelte-toolbelt', 'runed']
		}
	}
});
