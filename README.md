# Foragers Website

This project is a Vite-built multi-page site. Most page content lives directly in `src/*.html`, with a few shared pieces rendered at build time from partials and content files.

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

## Contributor Notes

- Shared head, header, nav, and footer markup live in `src/partials/`
- To change how menu Markdown is interpreted, update `build/foragers-html-plugin.mjs`
