/**
 * Compare pixel output of two fonts rendered at the same size.
 * Returns { totalPixels, matchingPixels, onlyAPixels, onlyBPixels, overlapPercent }
 */
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 400;

export function computePixelDiff(text, fontFamilyA, fontFamilyB, fontSize) {
	const canvas = document.createElement('canvas');
	canvas.width = CANVAS_WIDTH;
	canvas.height = CANVAS_HEIGHT;

	const dataA = renderToPixels(canvas, text, fontFamilyA, fontSize);
	const dataB = renderToPixels(canvas, text, fontFamilyB, fontSize);

	let totalA = 0;
	let totalB = 0;
	let matching = 0;
	let onlyA = 0;
	let onlyB = 0;

	for (let i = 0; i < dataA.length; i += 4) {
		// Check if pixel is "ink" (dark on white background) using red channel
		const isA = dataA[i] < 128;
		const isB = dataB[i] < 128;

		if (isA) totalA++;
		if (isB) totalB++;

		if (isA && isB) matching++;
		else if (isA) onlyA++;
		else if (isB) onlyB++;
	}

	const totalPixels = totalA + totalB - matching;
	const overlapPercent = totalPixels > 0 ? (matching / totalPixels) * 100 : 100;

	return { totalPixels, matching, onlyA, onlyB, overlapPercent };
}

function renderToPixels(canvas, text, fontFamily, fontSize) {
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = 'black';
	ctx.font = `${fontSize}px "${fontFamily}"`;
	ctx.textBaseline = 'top';
	ctx.fillText(text, 10, 10);
	return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

/**
 * Render the overlay canvas with both fonts in different colors.
 * showA/showB control which fonts are drawn.
 */
export function renderOverlay(
	canvas,
	text,
	fontFamilyA,
	fontFamilyB,
	fontSize,
	showA = true,
	showB = true,
) {
	const ctx = canvas.getContext('2d');
	const rect = canvas.getBoundingClientRect();
	const w = rect.width || canvas.width;
	const h = rect.height || canvas.height;

	ctx.save();
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.textBaseline = 'top';

	const bothVisible = showA && showB;

	if (showA) {
		ctx.globalAlpha = bothVisible ? 0.5 : 1.0;
		ctx.fillStyle = '#e74c3c';
		ctx.font = `${fontSize}px "${fontFamilyA}"`;
		drawWrappedText(ctx, text, fontSize, w, h);
	}

	if (showB) {
		ctx.globalAlpha = bothVisible ? 0.5 : 1.0;
		ctx.fillStyle = '#3498db';
		ctx.font = `${fontSize}px "${fontFamilyB}"`;
		drawWrappedText(ctx, text, fontSize, w, h);
	}

	ctx.globalAlpha = 1.0;
	ctx.restore();
}

function drawWrappedText(ctx, text, fontSize, canvasWidth, canvasHeight) {
	const lineHeight = fontSize * 1.3;
	const margin = 10;
	const maxWidth = canvasWidth - margin * 2;
	const words = text.split(' ');
	let line = '';
	let y = margin;

	for (const word of words) {
		const testLine = line ? `${line} ${word}` : word;
		const metrics = ctx.measureText(testLine);
		if (metrics.width > maxWidth && line) {
			ctx.fillText(line, margin, y);
			line = word;
			y += lineHeight;
			if (y > canvasHeight - margin) return;
		} else {
			line = testLine;
		}
	}
	if (line) {
		ctx.fillText(line, margin, y);
	}
}
