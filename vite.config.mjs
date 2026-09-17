import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { createForagersHtmlPlugin, getHtmlEntries } from './build/foragers-html-plugin.mjs';
import { fetchForagersGoogleReviews, getGoogleReviewsApiKey } from './build/google-reviews.mjs';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const srcRoot = resolve(projectRoot, 'src');

function createGoogleReviewsDevApiPlugin(env) {
	function registerGoogleReviewsMiddleware(server) {
		server.middlewares.use('/api/google-reviews.json', async (request, response) => {
			if (request.method !== 'GET') {
				response.statusCode = 405;
				response.setHeader('Content-Type', 'application/json; charset=utf-8');
				response.end(JSON.stringify({ error: 'Method not allowed.' }));
				return;
			}

			const apiKey = getGoogleReviewsApiKey(env);

			if (!apiKey) {
				response.statusCode = 503;
				response.setHeader('Content-Type', 'application/json; charset=utf-8');
				response.end(JSON.stringify({ error: 'Missing Google Places API key.' }));
				return;
			}

			try {
				const payload = await fetchForagersGoogleReviews({ apiKey });
				response.statusCode = 200;
				response.setHeader('Cache-Control', 'no-store');
				response.setHeader('Content-Type', 'application/json; charset=utf-8');
				response.end(JSON.stringify(payload));
			} catch (error) {
				response.statusCode = 502;
				response.setHeader('Content-Type', 'application/json; charset=utf-8');
				response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to load Google reviews.' }));
			}
		});
	}

	return {
		name: 'foragers-google-reviews-dev-api',
		configureServer(server) {
			registerGoogleReviewsMiddleware(server);
		},
		configurePreviewServer(server) {
			registerGoogleReviewsMiddleware(server);
		},
	};
}

export default defineConfig(({ mode }) => {
	const htmlEntries = getHtmlEntries(srcRoot);
	const env = loadEnv(mode, projectRoot, '');

	return {
		appType: 'mpa',
		root: srcRoot,
		plugins: [
			createForagersHtmlPlugin({ srcRoot }),
			createGoogleReviewsDevApiPlugin(env),
		],
		build: {
			outDir: resolve(projectRoot, 'dist'),
			emptyOutDir: true,
			rollupOptions: {
				input: htmlEntries,
			},
		},
	};
});
