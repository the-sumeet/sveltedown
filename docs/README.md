# sveltedown docs

The documentation site, built with [Starlight](https://starlight.astro.build/). Demos use the library's source (`../src/lib`) through a Vite alias, so they reflect local changes immediately.

```sh
npm install          # in the repo root too: the library source needs its dependencies
npm run dev          # http://localhost:4321
npm run build        # static site in dist/
npm run check        # astro check + svelte-check
```

`astro check` prints "Couldn't find package @astrojs/svelte" for the library's components in `../src/lib`. That's Astro's tooling looking for its integration outside this project; it doesn't affect the result.

From the repo root, `npm run docs:dev`, `docs:build` and `docs:check` do the same.

- Pages: `src/content/docs/` (Markdown/MDX); sidebar in `astro.config.mjs`.
- Live demos: `src/components/demos/*.svelte`, embedded with `client:visible`.
- Link between pages with **relative** links (`../theming/`). The site is served from a sub-path on GitHub Pages, and Starlight doesn't add the base path to Markdown links.
- Deployment: `.github/workflows/docs.yml` sets `DOCS_SITE` and `DOCS_BASE` for the GitHub Pages URL.
