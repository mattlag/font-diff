import { getState, setFont } from '../state.js';
import {
	formatFileSize,
	getFontCount,
	loadFont,
} from '../utils/font-loader.js';

const ACCEPTED = '.ttf,.otf,.woff,.woff2,.ttc,.otc,.cff,.pfb,.pfa';

export function initLoadTab(container) {
	const types = ACCEPTED.split(',')
		.map((e) => e.replace('.', '').toUpperCase())
		.join(', ');
	container.innerHTML = `
    <div class="load-grid">
      ${createDropZone('A')}
      ${createDropZone('B')}
    </div>
    <p class="load-supported-types">Supported formats: ${types}</p>
  `;

	const handleA = setupDropZone(
		container.querySelector('#drop-zone-a'),
		'fontA',
	);
	const handleB = setupDropZone(
		container.querySelector('#drop-zone-b'),
		'fontB',
	);

	// Wire cross-loading: extra file from A goes to B and vice versa
	handleA.onExtraFile = (file) => handleB.loadFile(file);
	handleB.onExtraFile = (file) => handleA.loadFile(file);
}

function createDropZone(label) {
	return `
    <div class="drop-zone" id="drop-zone-${label.toLowerCase()}">
      <input type="file" class="file-input" accept="${ACCEPTED}" multiple />
      <div class="drop-zone-prompt">
        <span class="drop-zone-label">Font ${label}</span>
        <span class="drop-zone-hint">Drop a font file here or click to browse</span>
      </div>
      <div class="drop-zone-loading hidden">
        <div class="spinner"></div>
        <span>Loading font&hellip;</span>
      </div>
      <div class="drop-zone-info hidden"></div>
      <div class="drop-zone-collection hidden">
        <label>Font index: <select class="collection-select"></select></label>
      </div>
    </div>
  `;
}

function setupDropZone(zone, slot) {
	const fileInput = zone.querySelector('.file-input');
	const prompt = zone.querySelector('.drop-zone-prompt');
	const loading = zone.querySelector('.drop-zone-loading');
	const info = zone.querySelector('.drop-zone-info');
	const collectionUI = zone.querySelector('.drop-zone-collection');
	const collectionSelect = zone.querySelector('.collection-select');

	// Returned handle for cross-loading
	const handle = { onExtraFile: null, loadFile: (file) => handleFile(file) };

	// Click to browse
	prompt.addEventListener('click', () => fileInput.click());

	// File input change
	fileInput.addEventListener('change', () => {
		if (fileInput.files.length) {
			handleFile(fileInput.files[0]);
			if (fileInput.files.length > 1 && handle.onExtraFile) {
				handle.onExtraFile(fileInput.files[1]);
			}
		}
	});

	// Drag and drop
	zone.addEventListener('dragover', (e) => {
		e.preventDefault();
		zone.classList.add('drag-over');
	});
	zone.addEventListener('dragleave', () => {
		zone.classList.remove('drag-over');
	});
	zone.addEventListener('drop', (e) => {
		e.preventDefault();
		zone.classList.remove('drag-over');
		if (e.dataTransfer.files.length) {
			handleFile(e.dataTransfer.files[0]);
			if (e.dataTransfer.files.length > 1 && handle.onExtraFile) {
				handle.onExtraFile(e.dataTransfer.files[1]);
			}
		}
	});

	// Collection index change
	collectionSelect.addEventListener('change', async () => {
		const idx = parseInt(collectionSelect.value, 10);
		const currentFile = getState()[slot]?.file;
		if (currentFile) {
			await processFont(currentFile, idx);
		}
	});

	async function handleFile(file) {
		// Show loading
		prompt.classList.add('hidden');
		info.classList.add('hidden');
		collectionUI.classList.add('hidden');
		loading.classList.remove('hidden');
		zone.classList.add('loading');

		try {
			// Check for font collection
			const count = await getFontCount(file);
			if (count > 1) {
				collectionSelect.innerHTML = '';
				for (let i = 0; i < count; i++) {
					const opt = document.createElement('option');
					opt.value = i;
					opt.textContent = `Font ${i}`;
					collectionSelect.appendChild(opt);
				}
				collectionUI.classList.remove('hidden');
			}

			await processFont(file, 0);
		} catch (err) {
			loading.classList.add('hidden');
			zone.classList.remove('loading');
			info.classList.remove('hidden');
			info.innerHTML = `<span class="error">Error: ${err.message}</span>`;
		}
	}

	async function processFont(file, collectionIndex) {
		loading.classList.remove('hidden');
		info.classList.add('hidden');
		zone.classList.add('loading');

		try {
			const fontInfo = await loadFont(file, collectionIndex);
			setFont(slot, fontInfo);

			// Show metadata
			const d = fontInfo.data;
			const familyName = d.info?.familyName || 'Unknown';
			const styleName = d.info?.styleName || '';
			const glyphCount = d.glyphCount ?? d.glyphs?.length ?? '?';
			const fileSize = formatFileSize(file.size);

			info.innerHTML = `
        <div class="font-meta">
          <strong>${familyName}</strong> ${styleName}
          <div class="font-meta-details">
            ${glyphCount} glyphs &middot; ${fileSize}
          </div>
          <div class="font-meta-file">${file.name}</div>
        </div>
      `;

			loading.classList.add('hidden');
			zone.classList.remove('loading');
			zone.classList.add('loaded');
			info.classList.remove('hidden');
			prompt.classList.add('hidden');
		} catch (err) {
			loading.classList.add('hidden');
			zone.classList.remove('loading');
			info.classList.remove('hidden');
			info.innerHTML = `<span class="error">Error: ${err.message}</span>`;
		}
	}

	return handle;
}
