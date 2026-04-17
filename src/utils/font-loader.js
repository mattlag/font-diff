import { FontFlux } from 'font-flux-js';

let fontFaceCounter = 0;

/**
 * Load a font file: parse it with font-flux-js and register it as a FontFace for canvas use.
 * For collections (TTC/OTC), pass collectionIndex to select which font (default 0).
 *
 * Returns { data, fontFamily, file, collectionIndex }
 *   - data: the FontFlux instance
 *   - fontFamily: the CSS font-family name registered via FontFace API
 *   - file: the original File object
 *   - collectionIndex: which font in a collection (0 for single fonts)
 */
export async function loadFont(file, collectionIndex = 0) {
	const buffer = await file.arrayBuffer();
	const tag = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
	const isCollection = tag === 'ttcf' || tag === 'otcf';
	const data = isCollection
		? FontFlux.openAll(buffer)[collectionIndex]
		: FontFlux.open(buffer);

	// Register as @font-face for canvas rendering.
	// Some formats (CFF, PFB, PFA) aren't supported by the browser's FontFace API,
	// so we export to a browser-friendly binary first and fall back gracefully.
	const fontFamily = `font-diff-${fontFaceCounter++}`;
	let fontFaceRegistered = false;
	try {
		let faceSource;
		const ext = file.name?.split('.').pop()?.toLowerCase();
		if (ext === 'cff' || ext === 'pfb' || ext === 'pfa') {
			const exportedBuffer = data.export({ format: 'sfnt' });
			const blob = new Blob([exportedBuffer], { type: 'font/otf' });
			faceSource = `url(${URL.createObjectURL(blob)})`;
		} else {
			faceSource = `url(${URL.createObjectURL(file)})`;
		}
		const face = new FontFace(fontFamily, faceSource);
		await face.load();
		document.fonts.add(face);
		fontFaceRegistered = true;
	} catch (err) {
		console.warn(
			`FontFace registration skipped for "${file.name}" - visual preview unavailable:`,
			err.message || err,
		);
	}

	return {
		data,
		fontFamily: fontFaceRegistered ? fontFamily : null,
		file,
		collectionIndex,
	};
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
