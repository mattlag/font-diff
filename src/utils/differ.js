import { diffLines } from 'diff';

const MAX_STRING_LENGTH = 500_000; // ~500KB cap per stringified value

/**
 * Return table names split into two groups: calculated fields and raw tables.
 * Instant — no computation.
 */
export function getTableNames(fontA, fontB) {
	const tablesA = fontA.tables || {};
	const tablesB = fontB.tables || {};
	const allKeys = [
		...new Set([...Object.keys(tablesA), ...Object.keys(tablesB)]),
	].sort();
	return {
		calculated: ['font', 'glyphs', 'kerning'],
		tables: allKeys,
	};
}

/**
 * Compute summary for a single table by name.
 * No diffLines — just string equality check for status.
 */
export function computeTableSummary(fontA, fontB, tableName) {
	if (tableName === 'glyphs') {
		return glyphsSummary(fontA.glyphs, fontB.glyphs);
	}
	if (tableName === 'font') {
		return buildSummaryEntry(
			'font',
			safeStringify(fontA.font),
			safeStringify(fontB.font),
		);
	}
	if (tableName === 'kerning') {
		return buildSummaryEntry(
			'kerning',
			safeStringify(fontA.kerning),
			safeStringify(fontB.kerning),
		);
	}
	const tablesA = fontA.tables || {};
	const tablesB = fontB.tables || {};
	return buildSummaryEntry(
		tableName,
		safeStringify(tablesA[tableName]),
		safeStringify(tablesB[tableName]),
	);
}

/**
 * Fast summary pass: computes status and line-count summaries for all tables
 * without building full diffParts. Used to render the collapsed overview.
 */
export function diffFontsSummary(fontA, fontB) {
	const tablesA = fontA.tables || {};
	const tablesB = fontB.tables || {};
	const allKeys = new Set([...Object.keys(tablesA), ...Object.keys(tablesB)]);

	const results = [];

	// Simplified top-level fields
	results.push(
		buildSummaryEntry(
			'font',
			safeStringify(fontA.font),
			safeStringify(fontB.font),
		),
	);

	// Glyphs summary (per-glyph comparison for counts, but no diffParts)
	results.push(glyphsSummary(fontA.glyphs, fontB.glyphs));

	// Kerning
	results.push(
		buildSummaryEntry(
			'kerning',
			safeStringify(fontA.kerning),
			safeStringify(fontB.kerning),
		),
	);

	// Each table
	for (const tableName of [...allKeys].sort()) {
		results.push(
			buildSummaryEntry(
				tableName,
				safeStringify(tablesA[tableName]),
				safeStringify(tablesB[tableName]),
			),
		);
	}

	return results;
}

/**
 * On-demand detail: computes full diffParts for a single table by name.
 * Called lazily when the user expands a section.
 */
export function diffTableDetail(fontA, fontB, tableName) {
	// Handle glyphs specially
	if (tableName.startsWith('glyphs')) {
		return diffGlyphsDetail(fontA.glyphs, fontB.glyphs);
	}
	if (tableName === 'font') {
		return buildDiffEntry(
			tableName,
			safeStringify(fontA.font),
			safeStringify(fontB.font),
		);
	}
	if (tableName === 'kerning') {
		return buildDiffEntry(
			tableName,
			safeStringify(fontA.kerning),
			safeStringify(fontB.kerning),
		);
	}
	const tablesA = fontA.tables || {};
	const tablesB = fontB.tables || {};
	return buildDiffEntry(
		tableName,
		safeStringify(tablesA[tableName]),
		safeStringify(tablesB[tableName]),
	);
}

/**
 * Legacy API — full diff of all tables with diffParts.
 * Kept for tests; prefer diffFontsSummary + diffTableDetail in the UI.
 */
export function diffFonts(fontA, fontB) {
	const tablesA = fontA.tables || {};
	const tablesB = fontB.tables || {};
	const allKeys = new Set([...Object.keys(tablesA), ...Object.keys(tablesB)]);

	const results = [];

	results.push(
		buildDiffEntry(
			'font',
			safeStringify(fontA.font),
			safeStringify(fontB.font),
		),
	);
	results.push(...diffGlyphsFull(fontA.glyphs, fontB.glyphs));
	results.push(
		buildDiffEntry(
			'kerning',
			safeStringify(fontA.kerning),
			safeStringify(fontB.kerning),
		),
	);

	for (const tableName of [...allKeys].sort()) {
		const strA = safeStringify(tablesA[tableName]);
		const strB = safeStringify(tablesB[tableName]);
		results.push(buildDiffEntry(tableName, strA, strB));
	}

	return results;
}

// ── Summary helpers (fast, no diffParts) ──────────────────

function buildSummaryEntry(tableName, strA, strB) {
	const hasA = strA !== undefined;
	const hasB = strB !== undefined;

	if (!hasA && !hasB)
		return {
			tableName,
			status: 'identical',
			summary: { added: 0, removed: 0, unchanged: 0 },
		};
	if (!hasA && hasB)
		return {
			tableName,
			status: 'only-b',
			summary: { added: countLines(strB), removed: 0, unchanged: 0 },
		};
	if (hasA && !hasB)
		return {
			tableName,
			status: 'only-a',
			summary: { added: 0, removed: countLines(strA), unchanged: 0 },
		};
	if (strA === strB)
		return {
			tableName,
			status: 'identical',
			summary: { added: 0, removed: 0, unchanged: countLines(strA) },
		};

	// Modified — skip diffLines for speed; exact counts deferred to detail view
	return {
		tableName,
		status: 'modified',
		summary: { added: 0, removed: 0, unchanged: 0 },
	};
}

function glyphsSummary(glyphsA, glyphsB) {
	const arrA = glyphsA || [];
	const arrB = glyphsB || [];
	const maxLen = Math.max(arrA.length, arrB.length);

	if (arrA.length === 0 && arrB.length === 0) {
		return {
			tableName: 'glyphs',
			status: 'identical',
			summary: { added: 0, removed: 0, unchanged: 0 },
		};
	}

	// Stringify entire arrays at once instead of per-glyph
	const strA = arrA.length > 0 ? safeStringify(arrA) : undefined;
	const strB = arrB.length > 0 ? safeStringify(arrB) : undefined;

	return buildSummaryEntry(`glyphs (${maxLen})`, strA, strB);
}

// ── Detail helpers (full diffParts, on-demand) ────────────

function diffGlyphsDetail(glyphsA, glyphsB) {
	const arrA = glyphsA || [];
	const arrB = glyphsB || [];
	const maxLen = Math.max(arrA.length, arrB.length);
	const allParts = [];

	for (let i = 0; i < maxLen; i++) {
		const strA = i < arrA.length ? safeStringify(arrA[i]) : undefined;
		const strB = i < arrB.length ? safeStringify(arrB[i]) : undefined;
		const entry = buildDiffEntry(`glyph[${i}]`, strA, strB);
		if (entry.status !== 'identical') {
			allParts.push(...entry.diffParts);
		}
	}

	return { tableName: 'glyphs', diffParts: allParts };
}

function diffGlyphsFull(glyphsA, glyphsB) {
	const arrA = glyphsA || [];
	const arrB = glyphsB || [];
	if (arrA.length === 0 && arrB.length === 0) {
		return [
			{
				tableName: 'glyphs',
				status: 'identical',
				summary: { added: 0, removed: 0, unchanged: 0 },
				diffParts: [],
			},
		];
	}

	const maxLen = Math.max(arrA.length, arrB.length);
	let totalAdded = 0,
		totalRemoved = 0,
		totalUnchanged = 0,
		anyChange = false;
	const allParts = [];

	for (let i = 0; i < maxLen; i++) {
		const strA = i < arrA.length ? safeStringify(arrA[i]) : undefined;
		const strB = i < arrB.length ? safeStringify(arrB[i]) : undefined;
		const entry = buildDiffEntry(`glyph[${i}]`, strA, strB);
		if (entry.status !== 'identical') anyChange = true;
		totalAdded += entry.summary.added;
		totalRemoved += entry.summary.removed;
		totalUnchanged += entry.summary.unchanged;
		allParts.push(...entry.diffParts);
	}

	return [
		{
			tableName: `glyphs (${maxLen})`,
			status: anyChange ? 'modified' : 'identical',
			summary: {
				added: totalAdded,
				removed: totalRemoved,
				unchanged: totalUnchanged,
			},
			diffParts: allParts,
		},
	];
}

function buildDiffEntry(tableName, strA, strB) {
	const hasA = strA !== undefined;
	const hasB = strB !== undefined;

	if (!hasA && !hasB) {
		return {
			tableName,
			status: 'identical',
			summary: { added: 0, removed: 0, unchanged: 0 },
			diffParts: [],
		};
	}
	if (!hasA && hasB) {
		return {
			tableName,
			status: 'only-b',
			summary: { added: countLines(strB), removed: 0, unchanged: 0 },
			diffParts: [{ added: true, value: strB }],
		};
	}
	if (hasA && !hasB) {
		return {
			tableName,
			status: 'only-a',
			summary: { added: 0, removed: countLines(strA), unchanged: 0 },
			diffParts: [{ removed: true, value: strA }],
		};
	}

	// Fast path: if strings are identical, skip diffLines entirely
	if (strA === strB) {
		return {
			tableName,
			status: 'identical',
			summary: { added: 0, removed: 0, unchanged: countLines(strA) },
			diffParts: [{ value: strA }],
		};
	}

	const parts = diffLines(strA, strB);
	const summary = { added: 0, removed: 0, unchanged: 0 };
	let isIdentical = true;

	for (const part of parts) {
		const lines = countLines(part.value);
		if (part.added) {
			summary.added += lines;
			isIdentical = false;
		} else if (part.removed) {
			summary.removed += lines;
			isIdentical = false;
		} else {
			summary.unchanged += lines;
		}
	}

	return {
		tableName,
		status: isIdentical ? 'identical' : 'modified',
		summary,
		diffParts: parts,
	};
}

function countLines(str) {
	if (!str) return 0;
	// Count newlines; a trailing newline doesn't add an extra line
	const matches = str.match(/\n/g);
	return matches ? matches.length : 1;
}

/**
 * Stringify a value for diffing. Handles BigInt, TypedArrays, undefined.
 * Returns undefined for null/undefined, caps output size.
 */
function safeStringify(value) {
	if (value === undefined || value === null) return undefined;
	const str = JSON.stringify(value, replacer, 2);
	if (str && str.length > MAX_STRING_LENGTH) {
		const lines = str.slice(0, MAX_STRING_LENGTH).split('\n');
		// Drop last partial line
		lines.pop();
		lines.push(`... (truncated, ${str.length.toLocaleString()} chars total)`);
		return lines.join('\n');
	}
	return str;
}

function replacer(_key, value) {
	if (typeof value === 'bigint') return value.toString();
	if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
		// Cap TypedArray expansion to avoid million-element arrays
		if (value.length > 200) {
			return `[TypedArray: ${value.constructor.name}, ${value.length.toLocaleString()} elements]`;
		}
		return Array.from(value);
	}
	return value;
}
