import { importFont } from 'font-flux-js';

let fontFaceCounter = 0;

/**
 * Load a font file: parse it with font-flux-js and register it as a FontFace for canvas use.
 * For collections (TTC/OTC), pass collectionIndex to select which font (default 0).
 *
 * Returns { data, fontFamily, file, collectionIndex }
 *   - data: the parsed font object from importFont
 *   - fontFamily: the CSS font-family name registered via FontFace API
 *   - file: the original File object
 *   - collectionIndex: which font in a collection (0 for single fonts)
 */
export async function loadFont(file, collectionIndex = 0) {
	const buffer = await file.arrayBuffer();
	const data = importFont(buffer, { collectionIndex });

	// Register as @font-face for canvas rendering
	const fontFamily = `font-diff-${fontFaceCounter++}`;
	const url = URL.createObjectURL(file);
	const face = new FontFace(fontFamily, `url(${url})`);
	await face.load();
	document.fonts.add(face);

	return { data, fontFamily, file, collectionIndex };
}

/**
 * Check if a file is likely a font collection (TTC/OTC) by reading the first 4 bytes.
 * Returns the number of fonts in the collection, or 1 for single fonts.
 */
export async function getFontCount(file) {
	const buffer = await file.slice(0, 12).arrayBuffer();
	const view = new DataView(buffer);
	const tag = String.fromCharCode(
		view.getUint8(0),
		view.getUint8(1),
		view.getUint8(2),
		view.getUint8(3),
	);
	if (tag === 'ttcf' || tag === 'otcf') {
		// numFonts is at offset 8 in the TTC/OTC header
		return view.getUint32(8);
	}
	return 1;
}

/**
 * Format a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
