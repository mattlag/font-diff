import { getState } from '../state.js';
import { computePixelDiff, renderOverlay } from '../utils/pixel-diff.js';

let container;
let canvas;
let textInput;
let sizeInput;
let showA = true;
let showB = true;

const DEFAULT_TEXT = 'The quick brown fox jumps over the lazy dog';
const DEFAULT_SIZE = 64;

export function initVisualTab(el) {
	container = el;
	container.innerHTML = `
    <div class="visual-layout">
      <aside class="visual-sidebar">
        <div class="visual-controls">
          <label class="control-label">
            Preview text
            <textarea id="visual-text" rows="4">${DEFAULT_TEXT}</textarea>
          </label>
          <label class="control-label">
            Size
            <div class="size-row">
              <input type="range" id="visual-size" min="12" max="200" value="${DEFAULT_SIZE}" />
              <span id="visual-size-value">${DEFAULT_SIZE}px</span>
            </div>
          </label>
        </div>
        <div class="visual-legend" id="visual-legend">
          <button class="legend-btn legend-a active" data-mode="a">
            <span class="legend-swatch swatch-a"></span>
            <span class="legend-label" id="legend-label-a">Font A</span>
          </button>
          <button class="legend-btn legend-overlap active" data-mode="both">
            <span class="legend-swatch swatch-overlap"></span>
            Both
          </button>
          <button class="legend-btn legend-b active" data-mode="b">
            <span class="legend-swatch swatch-b"></span>
            <span class="legend-label" id="legend-label-b">Font B</span>
          </button>
        </div>
        <div class="visual-stats" id="visual-stats"></div>
      </aside>
      <div class="visual-preview">
        <canvas id="visual-canvas"></canvas>
      </div>
    </div>
  `;

	canvas = container.querySelector('#visual-canvas');
	textInput = container.querySelector('#visual-text');
	sizeInput = container.querySelector('#visual-size');
	const sizeValue = container.querySelector('#visual-size-value');

	textInput.addEventListener('input', () => updateVisualTab());
	sizeInput.addEventListener('input', () => {
		sizeValue.textContent = `${sizeInput.value}px`;
		updateVisualTab();
	});

	// Legend toggle buttons
	container.querySelectorAll('.legend-btn').forEach((btn) => {
		btn.addEventListener('click', () => {
			const mode = btn.dataset.mode;
			if (mode === 'a') {
				showA = true;
				showB = false;
			} else if (mode === 'b') {
				showA = false;
				showB = true;
			} else {
				showA = true;
				showB = true;
			}
			// Update active states
			container.querySelectorAll('.legend-btn').forEach((b) => {
				b.classList.toggle('active', b.dataset.mode === mode);
			});
			updateVisualTab();
		});
	});

	// Keep canvas pixel dimensions in sync with its CSS size
	const ro = new ResizeObserver(() => {
		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(rect.width * dpr);
		canvas.height = Math.round(rect.height * dpr);
		canvas.getContext('2d').scale(dpr, dpr);
		updateVisualTab();
	});
	ro.observe(canvas);
}

export function updateVisualTab() {
	const { fontA, fontB } = getState();
	if (!fontA || !fontB || !canvas) return;

	// Update legend labels with file names
	const labelA = container.querySelector('#legend-label-a');
	const labelB = container.querySelector('#legend-label-b');
	if (labelA) labelA.textContent = fontA.file?.name || 'Font A';
	if (labelB) labelB.textContent = fontB.file?.name || 'Font B';

	const text = textInput.value || DEFAULT_TEXT;
	const fontSize = parseInt(sizeInput.value, 10) || DEFAULT_SIZE;

	// Render overlay with current toggle state
	renderOverlay(
		canvas,
		text,
		fontA.fontFamily,
		fontB.fontFamily,
		fontSize,
		showA,
		showB,
	);

	// Compute pixel stats
	const stats = computePixelDiff(
		text,
		fontA.fontFamily,
		fontB.fontFamily,
		fontSize,
	);
	const statsEl = container.querySelector('#visual-stats');
	statsEl.innerHTML = `
    <div class="stat">Overlap: <strong>${stats.overlapPercent.toFixed(1)}%</strong></div>
    <div class="stat">Matching: ${stats.matching.toLocaleString()}px</div>
    <div class="stat">Only A: ${stats.onlyA.toLocaleString()}px</div>
    <div class="stat">Only B: ${stats.onlyB.toLocaleString()}px</div>
  `;
}
