import { describe, expect, it } from 'vitest';
import { diffFonts } from '../src/utils/differ.js';

describe('diffFonts', () => {
	it('should handle two identical simple font objects', () => {
		const fontA = {
			info: { familyName: 'Test', unitsPerEm: 1000 },
			glyphs: [{ name: '.notdef', unicode: 0, advanceWidth: 500 }],
			kerning: null,
			tables: {
				head: { unitsPerEm: 1000, created: 0 },
			},
		};
		const fontB = structuredClone(fontA);

		const results = diffFonts(fontA, fontB);
		expect(results).toBeDefined();
		expect(results.length).toBeGreaterThan(0);

		for (const entry of results) {
			expect(entry.status).toBe('identical');
		}
	});

	it('should detect modifications between two font objects', () => {
		const fontA = {
			info: { familyName: 'FontA', unitsPerEm: 1000 },
			glyphs: [],
			kerning: null,
			tables: {
				head: { unitsPerEm: 1000 },
			},
		};
		const fontB = {
			info: { familyName: 'FontB', unitsPerEm: 2048 },
			glyphs: [],
			kerning: null,
			tables: {
				head: { unitsPerEm: 2048 },
			},
		};

		const results = diffFonts(fontA, fontB);
		const fontDiff = results.find((r) => r.tableName === 'font');
		expect(fontDiff.status).toBe('modified');
		expect(fontDiff.summary.added).toBeGreaterThan(0);
		expect(fontDiff.summary.removed).toBeGreaterThan(0);
	});

	it('should handle tables only in one font', () => {
		const fontA = {
			info: {},
			glyphs: [],
			kerning: null,
			tables: { head: { unitsPerEm: 1000 }, kern: { pairs: [] } },
		};
		const fontB = {
			info: {},
			glyphs: [],
			kerning: null,
			tables: { head: { unitsPerEm: 1000 } },
		};

		const results = diffFonts(fontA, fontB);
		const kernDiff = results.find((r) => r.tableName === 'kern');
		expect(kernDiff).toBeDefined();
		expect(kernDiff.status).toBe('only-a');
	});

	it('should handle both kerning fields being null/undefined without crashing', () => {
		// This is a likely crash case: both fonts have kerning: null
		// safeStringify returns undefined for both, and buildDiffEntry
		// would fall through to diffLines(undefined, undefined)
		const fontA = {
			info: { familyName: 'Test' },
			glyphs: [],
			kerning: null,
			tables: {},
		};
		const fontB = {
			info: { familyName: 'Test' },
			glyphs: [],
			kerning: null,
			tables: {},
		};

		// This should NOT throw
		expect(() => diffFonts(fontA, fontB)).not.toThrow();
	});

	it('should handle both kerning fields being undefined without crashing', () => {
		const fontA = {
			info: { familyName: 'Test' },
			glyphs: [],
			kerning: undefined,
			tables: {},
		};
		const fontB = {
			info: { familyName: 'Test' },
			glyphs: [],
			kerning: undefined,
			tables: {},
		};

		expect(() => diffFonts(fontA, fontB)).not.toThrow();
	});

	it('should handle moderately large glyph arrays without hanging', () => {
		// Simulate a font with 500 glyphs — this should complete quickly
		const makeGlyphs = (count) =>
			Array.from({ length: count }, (_, i) => ({
				name: `glyph${i}`,
				unicode: i + 32,
				advanceWidth: 500 + i,
				contours: [
					[
						{ x: 0, y: 0 },
						{ x: 100, y: 0 },
						{ x: 100, y: 100 },
						{ x: 0, y: 100 },
					],
				],
			}));

		const fontA = {
			info: { familyName: 'Test' },
			glyphs: makeGlyphs(500),
			kerning: [],
			tables: {},
		};
		const fontB = {
			info: { familyName: 'Test' },
			glyphs: makeGlyphs(500),
			kerning: [],
			tables: {},
		};
		// Modify a few glyphs in B
		fontB.glyphs[10].advanceWidth = 999;
		fontB.glyphs[200].name = 'changed';

		const start = performance.now();
		const results = diffFonts(fontA, fontB);
		const elapsed = performance.now() - start;

		expect(results).toBeDefined();
		// Should complete in under 5 seconds even on slow machines
		expect(elapsed).toBeLessThan(5000);
	}, 10000);

	it('should handle large glyph arrays (2000 glyphs) within reasonable time', () => {
		const makeGlyphs = (count) =>
			Array.from({ length: count }, (_, i) => ({
				name: `glyph${i}`,
				unicode: i + 32,
				advanceWidth: 500 + i,
				contours: [
					[
						{ x: 0, y: 0 },
						{ x: 100 + i, y: 0 },
						{ x: 100, y: 100 + i },
						{ x: 0, y: 100 },
					],
				],
			}));

		const fontA = {
			info: { familyName: 'Big Font' },
			glyphs: makeGlyphs(2000),
			kerning: [],
			tables: {},
		};
		const fontB = {
			info: { familyName: 'Big Font' },
			glyphs: makeGlyphs(2000),
			kerning: [],
			tables: {},
		};
		fontB.glyphs[500].advanceWidth = 999;

		const start = performance.now();
		const results = diffFonts(fontA, fontB);
		const elapsed = performance.now() - start;

		console.log(`2000 glyphs diff took ${elapsed.toFixed(0)}ms`);
		expect(results).toBeDefined();
		// This should still complete in reasonable time
		expect(elapsed).toBeLessThan(10000);
	}, 30000);

	it('should handle tables with large TypedArrays without hanging', () => {
		const fontA = {
			info: { familyName: 'Test' },
			glyphs: [],
			kerning: null,
			tables: {
				glyf: { data: new Uint8Array(50000) },
				head: { unitsPerEm: 1000 },
			},
		};
		const fontB = {
			info: { familyName: 'Test' },
			glyphs: [],
			kerning: null,
			tables: {
				glyf: { data: new Uint8Array(50000) },
				head: { unitsPerEm: 1000 },
			},
		};

		const start = performance.now();
		const results = diffFonts(fontA, fontB);
		const elapsed = performance.now() - start;

		console.log(`Large TypedArray diff took ${elapsed.toFixed(0)}ms`);
		expect(results).toBeDefined();
		expect(elapsed).toBeLessThan(2000);
	});

	it('should diff new v2 convenience fields (substitutions, axes, etc.)', () => {
		const fontA = {
			info: { familyName: 'VarFont' },
			glyphs: [],
			kerning: null,
			substitutions: [
				{
					type: 'ligature',
					feature: 'liga',
					components: ['f', 'i'],
					ligature: 'fi',
				},
			],
			axes: [{ tag: 'wght', min: 100, default: 400, max: 900, name: 'Weight' }],
			instances: [{ name: 'Bold', coordinates: { wght: 700 } }],
			axisMapping: {
				wght: [
					[100, 100],
					[400, 400],
					[900, 900],
				],
			},
			axisStyles: null,
			metricVariations: null,
			features: { GPOS: {} },
			palettes: null,
			colorGlyphs: null,
			tables: {},
		};
		const fontB = {
			info: { familyName: 'VarFont' },
			glyphs: [],
			kerning: null,
			substitutions: [],
			axes: [{ tag: 'wght', min: 200, default: 400, max: 900, name: 'Weight' }],
			instances: [{ name: 'Bold', coordinates: { wght: 700 } }],
			axisMapping: {
				wght: [
					[200, 200],
					[400, 400],
					[900, 900],
				],
			},
			axisStyles: null,
			metricVariations: null,
			features: { GPOS: {} },
			palettes: null,
			colorGlyphs: null,
			tables: {},
		};

		const results = diffFonts(fontA, fontB);

		const subsDiff = results.find((r) => r.tableName === 'substitutions');
		expect(subsDiff).toBeDefined();
		expect(subsDiff.status).toBe('modified');

		const axesDiff = results.find((r) => r.tableName === 'axes');
		expect(axesDiff).toBeDefined();
		expect(axesDiff.status).toBe('modified');

		const instancesDiff = results.find((r) => r.tableName === 'instances');
		expect(instancesDiff).toBeDefined();
		expect(instancesDiff.status).toBe('identical');

		const mappingDiff = results.find((r) => r.tableName === 'axisMapping');
		expect(mappingDiff).toBeDefined();
		expect(mappingDiff.status).toBe('modified');

		const featuresDiff = results.find((r) => r.tableName === 'features');
		expect(featuresDiff).toBeDefined();
		expect(featuresDiff.status).toBe('identical');
	});

	it('should handle missing convenience fields gracefully', () => {
		const fontA = {
			info: { familyName: 'Simple' },
			glyphs: [],
			kerning: null,
			tables: {},
		};
		const fontB = {
			info: { familyName: 'Simple' },
			glyphs: [],
			kerning: null,
			substitutions: [
				{
					type: 'ligature',
					feature: 'liga',
					components: ['f', 'i'],
					ligature: 'fi',
				},
			],
			tables: {},
		};

		expect(() => diffFonts(fontA, fontB)).not.toThrow();
		const results = diffFonts(fontA, fontB);
		const subsDiff = results.find((r) => r.tableName === 'substitutions');
		expect(subsDiff).toBeDefined();
		expect(subsDiff.status).toBe('only-b');
	});
});
