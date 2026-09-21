import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGooglePlacePhotos } from './google-reviews.mjs';

test('normalizeGooglePlacePhotos returns an empty array for missing photo data', () => {
	assert.deepEqual(normalizeGooglePlacePhotos(null), []);
	assert.deepEqual(normalizeGooglePlacePhotos({}), []);
});

test('normalizeGooglePlacePhotos removes photos without resource names', () => {
	assert.deepEqual(normalizeGooglePlacePhotos([
		{ widthPx: 100, heightPx: 100 },
		{ name: '   ' },
	]), []);
});

test('normalizeGooglePlacePhotos preserves resource names, dimensions, and attribution', () => {
	assert.deepEqual(normalizeGooglePlacePhotos([
		{
			name: 'places/example/photos/photo-1',
			widthPx: 1200,
			heightPx: 800,
			authorAttributions: [
				{ displayName: 'Jane Guest', uri: 'https://example.com/jane', photoUri: 'https://example.com/photo' },
			],
		},
	]), [
		{
			name: 'places/example/photos/photo-1',
			widthPx: 1200,
			heightPx: 800,
			attributions: [
				{ displayName: 'Jane Guest', uri: 'https://example.com/jane', photoUri: 'https://example.com/photo' },
			],
		},
	]);
});

test('normalizeGooglePlacePhotos limits the returned collection', () => {
	const photos = Array.from({ length: 12 }, (_, index) => ({
		name: `places/example/photos/photo-${index + 1}`,
	}));

	assert.equal(normalizeGooglePlacePhotos(photos).length, 10);
	assert.equal(normalizeGooglePlacePhotos(photos, { limit: 3 }).length, 3);
});
