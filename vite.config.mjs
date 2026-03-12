import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { createForagersHtmlPlugin, getHtmlEntries } from './build/foragers-html-plugin.mjs';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const srcRoot = resolve(projectRoot, 'src');
const htmlEntries = getHtmlEntries(srcRoot);

export default defineConfig({
	appType: 'mpa',
	root: srcRoot,
	plugins: [createForagersHtmlPlugin({ srcRoot })],
	build: {
		outDir: resolve(projectRoot, 'dist'),
		emptyOutDir: true,
		rollupOptions: {
			input: htmlEntries,
		},
	},
});
