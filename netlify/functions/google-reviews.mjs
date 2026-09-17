import { fetchForagersGoogleReviews, getGoogleReviewsApiKey } from '../../build/google-reviews.mjs';

const GOOGLE_REVIEWS_API_KEY_ENV_NAMES = [
	'GOOGLE_PLACES_API_KEY',
	'GOOGLE_MAPS_API_KEY',
	'VITE_GOOGLE_PLACES_API_KEY',
	'VITE_GOOGLE_MAPS_API_KEY',
];

function shouldIncludeEnvDiagnostics(event) {
	return event?.queryStringParameters?.debug === 'env';
}

function getEnvDiagnostics(env = process.env) {
	return {
		context: env.CONTEXT || '',
		branch: env.BRANCH || '',
		deployId: env.DEPLOY_ID || '',
		visibleAcceptedKeys: GOOGLE_REVIEWS_API_KEY_ENV_NAMES.filter((name) => Boolean(env[name])),
		presentAcceptedKeys: GOOGLE_REVIEWS_API_KEY_ENV_NAMES.filter((name) => Object.prototype.hasOwnProperty.call(env, name)),
	};
}

export async function handler(event = {}) {
	const apiKey = getGoogleReviewsApiKey(process.env);

	if (!apiKey) {
		const body = { error: 'Missing Google Places API key.' };

		if (shouldIncludeEnvDiagnostics(event)) {
			body.diagnostics = getEnvDiagnostics(process.env);
		}

		return {
			statusCode: 503,
			headers: {
				'Cache-Control': 'no-store',
				'Content-Type': 'application/json; charset=utf-8',
			},
			body: JSON.stringify(body),
		};
	}

	try {
		const payload = await fetchForagersGoogleReviews({ apiKey });

		return {
			statusCode: 200,
			headers: {
				'Cache-Control': 'public, max-age=300',
				'Content-Type': 'application/json; charset=utf-8',
			},
			body: JSON.stringify(payload),
		};
	} catch (error) {
		return {
			statusCode: 502,
			headers: {
				'Cache-Control': 'no-store',
				'Content-Type': 'application/json; charset=utf-8',
			},
			body: JSON.stringify({
				error: error instanceof Error ? error.message : 'Unable to load Google reviews.',
			}),
		};
	}
}
