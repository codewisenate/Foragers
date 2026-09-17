export const FORAGERS_GOOGLE_PLACE_ID = 'ChIJtXXnHQA_hlQRgJzPNb7TSrM';
const GOOGLE_PLACE_FIELDS = 'googleMapsUri,reviews';
const GOOGLE_LEGACY_PLACE_FIELDS = 'url,reviews';
const GOOGLE_REVIEW_MAX_LENGTH = 260;

function normalizeReviewText(text) {
	return text.replace(/\s+/g, ' ').trim();
}

function truncateReviewText(text, maxLength = GOOGLE_REVIEW_MAX_LENGTH) {
	if (text.length <= maxLength) {
		return text;
	}

	const truncatedText = text.slice(0, maxLength + 1);
	const lastSpaceIndex = truncatedText.lastIndexOf(' ');
	const safeLength = lastSpaceIndex > Math.floor(maxLength * 0.6) ? lastSpaceIndex : maxLength;
	return `${truncatedText.slice(0, safeLength).trimEnd()}...`;
}

function getReviewText(review) {
	return typeof review?.text?.text === 'string'
		? review.text.text
		: typeof review?.text === 'string'
			? review.text
			: '';
}

function isUsableFiveStarReview(review) {
	return review?.rating === 5 && getReviewText(review).trim() !== '';
}

function normalizeReview(review, { source, fallbackUrl = '' } = {}) {
	const reviewText = getReviewText(review);
	const reviewUrl = review.googleMapsUri?.trim()
		|| review.url?.trim()
		|| fallbackUrl
		|| review.author_url?.trim();
	const authorName = review.authorAttribution?.displayName?.trim()
		|| review.author_name?.trim()
		|| 'Google guest';
	const relativeTimeDescription = review.relativePublishTimeDescription?.trim()
		|| review.relative_time_description?.trim()
		|| 'Recently posted';

	return {
		authorName,
		relativeTimeDescription,
		text: truncateReviewText(normalizeReviewText(reviewText)),
		url: reviewUrl,
		source,
	};
}

function getReviewKey(review) {
	return normalizeReviewText(`${review.authorName} ${review.text}`).toLowerCase();
}

function dedupeReviews(reviews) {
	const dedupedReviews = new Map();

	for (const review of reviews) {
		const reviewKey = getReviewKey(review);
		const existingReview = dedupedReviews.get(reviewKey);

		if (!existingReview || (review.source === 'newest' && existingReview.source !== 'newest')) {
			dedupedReviews.set(reviewKey, {
				...review,
				url: existingReview?.url || review.url,
			});
		}
	}

	return [...dedupedReviews.values()];
}

async function fetchPlacesReviews({ apiKey, placeId, fetchImpl }) {
	const response = await fetchImpl(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
		headers: {
			'X-Goog-Api-Key': apiKey,
			'X-Goog-FieldMask': GOOGLE_PLACE_FIELDS,
		},
	});

	if (!response.ok) {
		throw new Error(`Place details request failed with ${response.status}`);
	}

	const place = await response.json();
	const fallbackUrl = place.googleMapsUri || '';
	const reviews = Array.isArray(place.reviews)
		? place.reviews
			.filter(isUsableFiveStarReview)
			.map((review) => normalizeReview(review, { source: 'places', fallbackUrl }))
		: [];

	return {
		url: fallbackUrl,
		reviews,
	};
}

async function fetchNewestReviews({ apiKey, placeId, fetchImpl }) {
	const requestUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
	requestUrl.searchParams.set('place_id', placeId);
	requestUrl.searchParams.set('fields', GOOGLE_LEGACY_PLACE_FIELDS);
	requestUrl.searchParams.set('reviews_sort', 'newest');
	requestUrl.searchParams.set('reviews_no_translations', 'true');
	requestUrl.searchParams.set('key', apiKey);

	const response = await fetchImpl(requestUrl.toString());

	if (!response.ok) {
		throw new Error(`Legacy place details request failed with ${response.status}`);
	}

	const payload = await response.json();

	if (payload.status !== 'OK') {
		throw new Error(`Legacy place details request failed with ${payload.status || 'unknown status'}`);
	}

	const place = payload.result || {};
	const fallbackUrl = place.url || '';
	const reviews = Array.isArray(place.reviews)
		? place.reviews
			.filter(isUsableFiveStarReview)
			.map((review) => normalizeReview(review, { source: 'newest', fallbackUrl }))
		: [];

	return {
		url: fallbackUrl,
		reviews,
	};
}

export function getGoogleReviewsApiKey(env = process.env) {
	return env.GOOGLE_PLACES_API_KEY
		|| env.GOOGLE_MAPS_API_KEY
		|| env.VITE_GOOGLE_PLACES_API_KEY
		|| env.VITE_GOOGLE_MAPS_API_KEY
		|| '';
}

export async function fetchForagersGoogleReviews({
	apiKey,
	placeId = FORAGERS_GOOGLE_PLACE_ID,
	fetchImpl = globalThis.fetch,
} = {}) {
	if (!apiKey) {
		throw new Error('Missing Google Places API key.');
	}

	if (typeof fetchImpl !== 'function') {
		throw new Error('Fetch implementation is not available.');
	}

	const [placesResult, newestResult] = await Promise.allSettled([
		fetchPlacesReviews({ apiKey, placeId, fetchImpl }),
		fetchNewestReviews({ apiKey, placeId, fetchImpl }),
	]);

	if (placesResult.status === 'rejected' && newestResult.status === 'rejected') {
		throw placesResult.reason;
	}

	const placesPayload = placesResult.status === 'fulfilled' ? placesResult.value : { reviews: [], url: '' };
	const newestPayload = newestResult.status === 'fulfilled' ? newestResult.value : { reviews: [], url: '' };
	const reviews = dedupeReviews([
		...newestPayload.reviews,
		...placesPayload.reviews,
	]);

	return {
		url: placesPayload.url || newestPayload.url || '',
		reviews,
		newestReviews: reviews.filter((review) => review.source === 'newest'),
	};
}
