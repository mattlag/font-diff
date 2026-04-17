import { initWoff2 } from 'font-flux-js';
import { bothFontsLoaded, getState, onStateChange } from './state.js';
import './style.css';
import { initDiffTab, updateDiffTab } from './tabs/diff.js';
import { initInfoTab } from './tabs/info.js';
import { initLoadTab } from './tabs/load.js';
import { initVisualTab, updateVisualTab } from './tabs/visual.js';

let currentTab = 'load';

async function main() {
	// Initialize WOFF2 support once at startup
	await initWoff2();

	// Initialize each tab
	initLoadTab(document.getElementById('tab-load'));
	initDiffTab(document.getElementById('tab-diff'));
	initVisualTab(document.getElementById('tab-visual'));
	initInfoTab(document.getElementById('tab-info'));

	// Tab switching
	const tabButtons = document.querySelectorAll('.tab-button');
	tabButtons.forEach((btn) => {
		btn.addEventListener('click', () => {
			if (btn.disabled) return;
			switchTab(btn.dataset.tab);
		});
	});

	// Enable/disable tabs when fonts are loaded
	let wasReady = false;
	onStateChange(() => {
		const ready = bothFontsLoaded();
		const diffBtn = document.querySelector('[data-tab="diff"]');
		const visualBtn = document.querySelector('[data-tab="visual"]');
		diffBtn.disabled = !ready;
		visualBtn.disabled = !ready;

		if (ready && !wasReady) {
			diffBtn.classList.add('tab-sparkle');
			visualBtn.classList.add('tab-sparkle');
			const onEnd = (e) => e.target.classList.remove('tab-sparkle');
			diffBtn.addEventListener('animationend', onEnd, { once: true });
			visualBtn.addEventListener('animationend', onEnd, { once: true });
		}
		wasReady = ready;

		if (ready && currentTab === 'diff') updateDiffTab();
		if (ready && currentTab === 'visual') updateVisualTab();

		// Update download button and item labels
		const { fontA, fontB } = getState();
		const dlBtn = document.querySelector('.btn-download');
		dlBtn.disabled = !fontA && !fontB;
		const itemA = document.querySelector('[data-slot="fontA"]');
		const itemB = document.querySelector('[data-slot="fontB"]');
		itemA.textContent = fontA?.file?.name?.replace(/\.[^.]+$/, '') || 'Font A';
		itemA.disabled = !fontA;
		itemB.textContent = fontB?.file?.name?.replace(/\.[^.]+$/, '') || 'Font B';
		itemB.disabled = !fontB;
	});

	// Download JSON dropdown
	const dropdown = document.getElementById('download-dropdown');
	const dlBtn = dropdown.querySelector('.btn-download');
	dlBtn.addEventListener('click', () => {
		dropdown.classList.toggle('open');
	});
	document.addEventListener('click', (e) => {
		if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
	});
	dropdown.querySelectorAll('.dropdown-item').forEach((item) => {
		item.addEventListener('click', () => {
			dropdown.classList.remove('open');
			const slot = item.dataset.slot;
			const font = getState()[slot];
			if (!font) return;
			const json = JSON.stringify(font.data, jsonReplacer, 2);
			const blob = new Blob([json], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const baseName = font.file?.name?.replace(/\.[^.]+$/, '') || slot;
			a.download = `${baseName}.json`;
			a.click();
			URL.revokeObjectURL(url);
		});
	});
}

function switchTab(tabName) {
	currentTab = tabName;

	// Update buttons
	document.querySelectorAll('.tab-button').forEach((btn) => {
		btn.classList.toggle('active', btn.dataset.tab === tabName);
	});

	// Update content panels
	document.querySelectorAll('.tab-content').forEach((panel) => {
		panel.classList.toggle('active', panel.id === `tab-${tabName}`);
	});

	// Trigger updates on tab switch
	if (tabName === 'diff' && bothFontsLoaded()) updateDiffTab();
	if (tabName === 'visual' && bothFontsLoaded()) updateVisualTab();
}

main();

function jsonReplacer(_key, value) {
	if (typeof value === 'bigint') return value.toString();
	if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
		return Array.from(value);
	}
	return value;
}
