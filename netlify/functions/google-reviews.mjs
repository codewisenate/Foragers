import { fetchForagersGoogleReviews, getGoogleReviewsApiKey } from '../../build/google-reviews.mjs';

export async function handler() {
	const apiKey = getGoogleReviewsApiKey(process.env);

	if (!apiKey) {
		return {
			statusCode: 503,
			headers: {
				'Cache-Control': 'no-store',
				'Content-Type': 'application/json; charset=utf-8',
			},
			body: JSON.stringify({ error: 'Missing Google Places API key.' }),
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
