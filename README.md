# Foragers Website

This project is a Vite-built multi-page site. Most page content lives directly in `src/*.html`, with a few shared pieces rendered at build time from partials and content files.

Shared generated content currently includes:

- `src/content/menu.md` for the dining menu
- `src/content/patio.md` for the patio menu
- `src/content/cocktails.md` for cocktails
- `src/content/home-banner.md` for the homepage announcement banner
- `src/content/hours.md` for the Visit Foragers hours grid and homepage today-hours card
- `src/content/events.md` for dated homepage events and listings
- `src/content/evergreen-events.md` for fallback homepage events and gatherings cards
- `src/content/meads.md` for the editable Current Expressions mead cards

## Editing the Menu

The dining menu on `On the Table` is generated from:

`src/content/menu.md`

Do not edit the menu HTML in `src/on-the-table.html` or anything in `dist/`. The build injects the menu into the `.menu-grid` section automatically.

## Menu Format

The parser expects a very simple Markdown structure:

- `#` starts a menu section/category
- `##` starts a menu item inside the current section
- The text below a `##` heading becomes that item's description

Example:

```md
# Appetizers

## Braised Beef Cheek

Sunchoke & Vanilla Puree, Puffed Wild Rice, Brown Sugar & Molasses Glaze

## Elk Tartare

Carrot Mole, Carrot Chips, Carrot Top Powder

# Mains

## Roasted Beef Tenderloin

Charred Onion Puree, Pickled Pearl Onion, Bone Marrow & Peppercorn Jus, Broccolini
```

## Rules Contributors Should Follow

- Start each section with a single `#` heading.
- Start each dish with a single `##` heading.
- Keep each dish description directly under its `##` heading.
- Blank lines are fine and help readability.
- If a description wraps to multiple lines, it will be combined into one paragraph in the built HTML.
- Do not put loose text above the first `#` heading or between sections/items.
- Do not use deeper Markdown headings like `###`.

## What the Build Does

During dev and build:

- `src/content/menu.md` is parsed by `build/foragers-html-plugin.mjs`
- The content is rendered into the existing `.menu-grid` markup in `src/on-the-table.html`
- Item names become menu item headings
- Item descriptions become menu item paragraphs

Special characters such as `&`, accented characters, and apostrophes are safely escaped for HTML output.

## Previewing Changes

Run the watcher for live preview:

```bash
npm run watch
```

Create a production build:

```bash
npm run build
```

The built site is written to:

`dist/`

## Editing Homepage Events

The homepage `Events & Gatherings` cards are generated from two files:

- `src/content/events.md` for dated listings
- `src/content/evergreen-events.md` for evergreen fallback cards

Each event starts with a `#` or `##` heading. Decorators under the heading set the card metadata, and the body text becomes the card description.

```md
## Harvest Long Table Dinner
@eyebrow: October 18
@where: Foragers
@address: 801 Leek Road, Roberts Creek, BC
@active: 2026-09-20..2026-10-18
@days: Saturday
@link: reserve-your-place.html#opentable | Reserve your place

A one-night seasonal dinner shaped by orchard fruit, coastal ingredients, and Foragers mead pairings.
```

Event decorators:

- `@eyebrow:` optional small label above the event title
- `@where:` optional location or venue line
- `@address:` optional address line used for the Google Maps link; it is not displayed when paired with `@where`
- `@link:` optional link destination, optionally followed by a label separated by `|`; a custom label fully replaces the default `Details about [event title]` label
- `@active:` optional event date or inclusive event date range, using `YYYY-MM-DD` or `YYYY-MM-DD..YYYY-MM-DD`
- `@days:` optional weekday names within an `@active` range, such as `Saturday` or `Saturday, Sunday`; recurring cards only show on matching weekdays within the active range

Dated events are shown while they are upcoming or currently happening, then hidden after their end date passes. If one or two dated events are active, the homepage fills the remaining card slots with cards from `src/content/evergreen-events.md` until there are three cards. If three or more dated events are active, the homepage shows all active events instead of the evergreen set. If no dated events are active, the evergreen events are shown.

Blank lines in event descriptions create separate paragraphs. Line breaks inside a paragraph are preserved as line breaks in the event card.

## Editing Current Expressions

The editable mead cards on `In the Glass` are generated from `src/content/meads.md`. The first logo card and final building-sketch card remain static in `src/in-the-glass.html`.

Each mead starts with a heading. Use `@available: false` to add the `.coming` class.

```md
# Elemental
@tag: Light, floral, effortless
@type: Mead
@style: White
@abv: 13.5
@available: true

Bright and wonderfully drinkable, with a refined, light honey character.
```

## Google Reviews On The Homepage

The homepage loads the available five-star Google reviews and place photos from an internal JSON endpoint, links each review card to Google Maps, and randomly displays three reviews on each page load. The displayed review set forces one review from the newest-sorted Google Maps/Places legacy response when a five-star text review is available, then fills the remaining cards from the combined review pool. The Show more reviews button reveals up to two additional batches of three reviews before hiding, for a maximum of nine visible reviews. Place photos are rendered independently as a bento mosaic above the review cards; they are associated with the place, not with individual reviews.

- local Vite dev and preview: `/api/google-reviews.json` is served by a Vite middleware
- Netlify production: `/api/google-reviews.json` is redirected to `/.netlify/functions/google-reviews`

Set one of these variables in a local `.env` file:

- `VITE_GOOGLE_PLACES_API_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`

For Netlify, set one of these environment variables in the site settings:

- `GOOGLE_PLACES_API_KEY`
- `GOOGLE_MAPS_API_KEY`

The key stays server-side in production. Google Places only exposes a limited review subset rather than the full review history. The endpoint combines relevance-sorted reviews and place photos from Places API New with newest-sorted reviews from the legacy Place Details endpoint, but each review source can still return at most five reviews. The legacy newest response is filtered to five-star text reviews after Google returns it, so there may not always be a usable newest review. If the endpoint cannot load reviews, the homepage falls back to a static Google Maps link. If no usable photos are available, the photo mosaic is omitted.

## Contributor Notes

- Shared head, header, nav, and footer markup live in `src/partials/`
- To change how menu Markdown is interpreted, update `build/foragers-html-plugin.mjs`
