<script lang="ts">
	import { MarkdownEditor } from '@the-sumeet/sveltedown';

	const fonts = {
		Docs: 'var(--sl-font)',
		Serif: "Georgia, 'Times New Roman', serif",
		Mono: 'ui-monospace, SFMono-Regular, Menlo, monospace'
	};

	let value = $state(
		[
			'# Theme me',
			'',
			'Some **bold** text, a [link](https://svelte.dev) and `inline code`.',
			'',
			'- [x] Pick colours',
			'- [ ] Copy the CSS',
			'',
			'```css',
			'.sveltedown { --md-link-color: tomato; }',
			'```'
		].join('\n')
	);
	let link = $state('#d6336c');
	let heading = $state('#7048e8');
	let accent = $state('#2f9e44');
	// Unset until picked: one fixed colour can't suit both light and dark mode.
	let codeBlock: string | null = $state(null);
	let font: keyof typeof fonts = $state('Docs');
	let size = $state(16);
	let lineHeight = $state(1.6);

	// The defaults live on the editor element, so overrides must target it (here via the
	// `class` prop), not an ancestor. The rule shown below is the rule applied.
	const css = $derived(
		[
			'.theme-demo {',
			`  --md-link-color: ${link};`,
			`  --md-heading-color: ${heading};`,
			`  --md-accent: ${accent};`,
			...(codeBlock ? [`  --md-code-block-bg: ${codeBlock};`] : []),
			`  --md-font-family: ${fonts[font]};`,
			`  --md-font-size: ${size}px;`,
			`  --md-line-height: ${lineHeight};`,
			'}'
		].join('\n')
	);
</script>

<svelte:head>
	<!-- Values come from colour, range and select inputs only. -->
	{@html `<style>${css}</style>`}
</svelte:head>

<div class="demo not-content">
	<div class="demo-controls">
		<label>Links <input type="color" bind:value={link} /></label>
		<label>Headings <input type="color" bind:value={heading} /></label>
		<label>Accent <input type="color" bind:value={accent} /></label>
		<label>
			Code blocks
			<input
				type="color"
				value={codeBlock ?? '#f6f8fa'}
				oninput={(event) => (codeBlock = event.currentTarget.value)}
			/>
		</label>
		<label>
			Font
			<select bind:value={font}>
				{#each Object.keys(fonts) as name (name)}
					<option>{name}</option>
				{/each}
			</select>
		</label>
		<label>Size <input type="range" min="13" max="22" bind:value={size} /> {size}px</label>
		<label>
			Line height <input type="range" min="1.2" max="2" step="0.1" bind:value={lineHeight} />
			{lineHeight}
		</label>
	</div>
	<div class="demo-editor" style:--demo-height="16rem">
		<MarkdownEditor bind:value class="theme-demo" />
	</div>
	<textarea readonly aria-label="Generated CSS" value={css}></textarea>
</div>
