import { readFileSync, readdirSync } from 'node:fs';
import { basename, extname, relative, resolve } from 'node:path';

const PROJECT_PAGES = new Set([
	'index.html',
	'where-it-begins.html',
	'in-the-glass.html',
	'on-the-table.html',
	'orchard-apiary.html',
	'rooted-in-craft.html',
	'visit-foragers.html',
	'reserve-your-place.html',
]);

export function getHtmlEntries(srcRoot) {
	return Object.fromEntries(
		readdirSync(srcRoot)
			.filter((file) => extname(file) === '.html' && PROJECT_PAGES.has(file))
			.map((file) => [basename(file, '.html'), resolve(srcRoot, file)])
	);
}

export function createForagersHtmlPlugin({ srcRoot }) {
	const partialsRoot = resolve(srcRoot, 'partials');
	const contentRoot = resolve(srcRoot, 'content');
	const menuContentPath = resolve(contentRoot, 'menu.md');
	const cocktailsContentPath = resolve(contentRoot, 'cocktails.md');
	const hoursContentPath = resolve(contentRoot, 'hours.md');

	function getCurrentPage(ctx) {
		if (ctx.filename) {
			return basename(ctx.filename);
		}

		const path = ctx.path?.split('?')[0] ?? '';
		if (path === '/' || path === '') {
			return 'index.html';
		}

		return basename(path);
	}

	function readPartial(partialName) {
		return readFileSync(resolve(partialsRoot, `${partialName}.html`), 'utf8').trim();
	}

	function escapeHtml(text) {
		return text
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#39;');
	}

	function slugify(value) {
		return value
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[^\w\s-]/g, '')
			.trim()
			.replace(/\s+/g, '-');
	}

	function normalizeInlineText(lines) {
		return lines.join(' ').replace(/\s+/g, ' ').trim();
	}

	function normalizeMenuItemLine(line) {
		const normalizedLine = line.replace(/\s+/g, ' ').trim();
		const priceMatch = normalizedLine.match(/^\-\s+(\d+(?:\.\d{1,2})?)$/);
		return priceMatch ? priceMatch[1] : normalizedLine;
	}

	function parseMenuMarkdown(markdown) {
		const sections = [];
		let currentSection = null;
		let currentItem = null;
		let descriptionLines = [];

		function flushItem() {
			if (!currentSection || !currentItem) {
				descriptionLines = [];
				return;
			}

			currentItem.descriptionLines = descriptionLines
				.map(normalizeMenuItemLine)
				.filter(Boolean);
			currentSection.items.push(currentItem);
			currentItem = null;
			descriptionLines = [];
		}

		function flushSection() {
			flushItem();
			if (currentSection) {
				sections.push(currentSection);
				currentSection = null;
			}
		}

		for (const line of markdown.split(/\r?\n/)) {
			const trimmed = line.trim();

			if (trimmed.startsWith('# ')) {
				flushSection();
				currentSection = {
					title: trimmed.slice(2).trim(),
					items: [],
				};
				continue;
			}

			if (trimmed.startsWith('## ')) {
				flushItem();
				if (!currentSection) {
					throw new Error('Menu item found before any menu section heading.');
				}

				currentItem = {
					name: trimmed.slice(3).trim(),
					descriptionLines: [],
				};
				continue;
			}

			if (trimmed === '') {
				continue;
			}

			if (!currentItem) {
				throw new Error(`Unexpected menu content outside a menu item: "${trimmed}"`);
			}

			descriptionLines.push(trimmed);
		}

		flushSection();
		return sections;
	}

	function renderMenuGrid({
		contentPath,
		ariaLabel,
		idPrefix,
		expandedLabel = 'Hide dishes',
		collapsedLabel = 'Tap to reveal',
	}) {
		const menuMarkdown = readFileSync(contentPath, 'utf8');
		const sections = parseMenuMarkdown(menuMarkdown);

		const sectionMarkup = sections.map((section) => {
			const slug = slugify(section.title);
			const labelId = `${idPrefix}-${slug}-label`;
			const toggleId = `${idPrefix}-${slug}-toggle`;
			const listId = `${idPrefix}-${slug}-list`;
			const itemsMarkup = section.items.map((item) => {
				const descriptionMarkup = item.descriptionLines.length > 0
					? `\n\t\t\t\t\t\t\t\t<p>${item.descriptionLines.map((line) => escapeHtml(line)).join('<br>')}</p>`
					: '';

				return [
					'\t\t\t\t\t\t\t<article class="menu-item">',
					`\t\t\t\t\t\t\t\t<h3>${escapeHtml(item.name)}</h3>${descriptionMarkup}`,
					'\t\t\t\t\t\t\t</article>',
				].join('\n');
			}).join('\n');

			return [
				`\t\t\t\t\t<section class="menu-category" aria-labelledby="${labelId}">`,
				`\t\t\t\t\t\t<button class="menu-category-toggle" id="${toggleId}" type="button" aria-expanded="false" aria-controls="${listId}" data-expanded-label="${escapeHtml(expandedLabel)}" data-collapsed-label="${escapeHtml(collapsedLabel)}">`,
				`\t\t\t\t\t\t\t<span class="menu-category-label" id="${labelId}">${escapeHtml(section.title)}</span>`,
				'\t\t\t\t\t\t\t<span class="menu-category-toggle-meta">',
				`\t\t\t\t\t\t\t\t<span class="menu-category-toggle-text">${escapeHtml(collapsedLabel)}</span>`,
				'\t\t\t\t\t\t\t\t<span class="menu-category-toggle-icon" aria-hidden="true"></span>',
				'\t\t\t\t\t\t\t</span>',
				'\t\t\t\t\t\t</button>',
				`\t\t\t\t\t\t<div class="menu-list" id="${listId}">`,
				itemsMarkup,
				'\t\t\t\t\t\t</div>',
				'\t\t\t\t\t</section>',
			].join('\n');
		}).join('\n');

		return [
			`<div class="menu-grid" aria-label="${escapeHtml(ariaLabel)}">`,
			sectionMarkup,
			'\t\t\t\t</div>',
		].join('\n');
	}

	function parseHoursMarkdown(markdown) {
		const sections = [];
		let currentSection = null;
		let currentEntry = null;
		let paragraphLines = [];

		function flushParagraph() {
			if (!currentSection || paragraphLines.length === 0) {
				paragraphLines = [];
				return;
			}

			currentSection.paragraphs.push(normalizeInlineText(paragraphLines));
			paragraphLines = [];
		}

		function flushEntry() {
			if (!currentSection || !currentEntry) {
				return;
			}

			const lines = currentEntry.lines
				.map((line) => line.trim())
				.filter(Boolean);

			if (lines.length === 0) {
				throw new Error(`Hours entry "${currentEntry.label}" is missing its content.`);
			}

			currentSection.entries.push({
				...currentEntry,
				lines,
			});
			currentEntry = null;
		}

		function flushSection() {
			flushEntry();
			flushParagraph();

			if (currentSection) {
				if (currentSection.entries.length === 0 && currentSection.paragraphs.length === 0) {
					throw new Error(`Hours section "${currentSection.title}" is empty.`);
				}

				sections.push(currentSection);
				currentSection = null;
			}
		}

		for (const line of markdown.split(/\r?\n/)) {
			const trimmed = line.trim();

			if (trimmed.startsWith('# ')) {
				flushSection();
				currentSection = {
					title: trimmed.slice(2).trim(),
					entries: [],
					paragraphs: [],
				};
				continue;
			}

			if (trimmed.startsWith('## ')) {
				if (!currentSection) {
					throw new Error('Hours entry found before any hours section heading.');
				}

				flushEntry();
				flushParagraph();
				currentEntry = {
					label: trimmed.slice(3).trim(),
					lines: [],
				};
				continue;
			}

			if (trimmed === '') {
				if (currentEntry?.lines.length) {
					flushEntry();
				} else {
					flushParagraph();
				}
				continue;
			}

			if (!currentSection) {
				throw new Error(`Unexpected hours content outside a section: "${trimmed}"`);
			}

			if (currentEntry) {
				currentEntry.lines.push(trimmed);
				continue;
			}

			paragraphLines.push(trimmed);
		}

		flushSection();
		return sections;
	}

	function renderHoursGrid() {
		const hoursMarkdown = readFileSync(hoursContentPath, 'utf8');
		const sections = parseHoursMarkdown(hoursMarkdown);
		const slugCounts = new Map();

		function getSectionLabelId(title) {
			const baseSlug = slugify(title) || 'section';
			const currentCount = slugCounts.get(baseSlug) ?? 0;
			slugCounts.set(baseSlug, currentCount + 1);
			const suffix = currentCount === 0 ? '' : `-${currentCount + 1}`;
			return `visit-hours-${baseSlug}${suffix}`;
		}

		function renderEntryLines(lines) {
			if (lines.length === 1) {
				return `\t\t\t\t\t\t\t\t\t<span class="visit-hours-time">${escapeHtml(lines[0])}</span>`;
			}

			const valueMarkup = lines.map((line) => (
				`\t\t\t\t\t\t\t\t\t\t<span class="visit-hours-time">${escapeHtml(line)}</span>`
			)).join('\n');

			return [
				'\t\t\t\t\t\t\t\t\t<div class="visit-hours-values">',
				valueMarkup,
				'\t\t\t\t\t\t\t\t\t</div>',
			].join('\n');
		}

		const sectionMarkup = sections.map((section) => {
			const labelId = getSectionLabelId(section.title);
			const contentParts = [];

			if (section.entries.length > 0) {
				const entryMarkup = section.entries.map((entry) => [
					'\t\t\t\t\t\t\t\t<li>',
					`\t\t\t\t\t\t\t\t\t<span>${escapeHtml(entry.label)}</span>`,
					renderEntryLines(entry.lines),
					'\t\t\t\t\t\t\t\t</li>',
				].join('\n')).join('\n');

				contentParts.push([
					'\t\t\t\t\t\t\t<ul class="visit-hours-list">',
					entryMarkup,
					'\t\t\t\t\t\t\t</ul>',
				].join('\n'));
			}

			if (section.paragraphs.length > 0) {
				contentParts.push(section.paragraphs.map((paragraph) => (
					`\t\t\t\t\t\t\t<p>${escapeHtml(paragraph)}</p>`
				)).join('\n'));
			}

			return [
				`\t\t\t\t\t\t<section class="visit-hours-item" aria-labelledby="${labelId}">`,
				`\t\t\t\t\t\t\t<h4 id="${labelId}">${escapeHtml(section.title)}</h4>`,
				contentParts.join('\n'),
				'\t\t\t\t\t\t</section>',
			].join('\n');
		}).join('\n');

		return [
			'<div class="visit-hours" aria-label="Current tasting room, dining lounge, and patio hours">',
			sectionMarkup,
			'\t\t\t\t\t</div>',
		].join('\n');
	}

	function renderPartial(partialName, currentPage) {
		return readPartial(partialName)
			.replace(/ \{\{aria-current:([^}]+)\}\}/g, (_, pageName) => (
				pageName === currentPage ? ' aria-current="page"' : ''
			));
	}

	function isPartialFile(filePath) {
		const relativePath = relative(partialsRoot, resolve(filePath));
		return relativePath !== '' && !relativePath.startsWith('..') && !relativePath.startsWith('.');
	}

	function isGeneratedContentFile(filePath) {
		const resolvedPath = resolve(filePath);
		return resolvedPath === menuContentPath
			|| resolvedPath === cocktailsContentPath
			|| resolvedPath === hoursContentPath;
	}

	function renderInclude(includeName, currentPage) {
		if (includeName === 'menu-grid') {
			return renderMenuGrid({
				contentPath: menuContentPath,
				ariaLabel: 'Current seasonal menu',
				idPrefix: 'menu',
				expandedLabel: 'Hide dishes',
			});
		}

		if (includeName === 'cocktails-grid') {
			return renderMenuGrid({
				contentPath: cocktailsContentPath,
				ariaLabel: 'Current cocktails menu',
				idPrefix: 'cocktails-menu',
				expandedLabel: 'Hide cocktails',
			});
		}

		if (includeName === 'hours-grid') {
			return renderHoursGrid();
		}

		return renderPartial(includeName, currentPage);
	}

	return {
		name: 'foragers-partial-include',
		transformIndexHtml: {
			order: 'pre',
			handler(html, ctx) {
				return html.replace(/<!-- @include:([a-z-]+) -->/g, (_, partialName) => (
					renderInclude(partialName, getCurrentPage(ctx))
				));
			},
		},
		configureServer(server) {
			server.watcher.add(partialsRoot);
			server.watcher.add(menuContentPath);
			server.watcher.add(cocktailsContentPath);
			server.watcher.add(hoursContentPath);
		},
		handleHotUpdate(ctx) {
			if (!isPartialFile(ctx.file) && !isGeneratedContentFile(ctx.file)) {
				return;
			}

			ctx.server.ws.send({ type: 'full-reload' });
			return [];
		},
	};
}
