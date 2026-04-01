import { getState } from '../state.js';
import {
	computeTableSummary,
	diffTableDetail,
	getTableNames,
} from '../utils/differ.js';

let container;
let currentRun = 0;

export function initDiffTab(el) {
	container = el;
	container.innerHTML =
		'<p class="placeholder">Load two fonts to see their differences.</p>';
}

export function updateDiffTab() {
	const { fontA, fontB } = getState();
	if (!fontA || !fontB) return;

	const run = ++currentRun;
	const { calculated, tables } = getTableNames(fontA.data, fontB.data);
	const allNames = [...calculated, ...tables];

	const renderSection = (names, startIdx) =>
		names
			.map(
				(name, i) => `
      <details class="diff-table-section" data-table="${escapeHtml(name)}" data-idx="${startIdx + i}">
        <summary class="diff-table-header">
          <span class="table-name">${escapeHtml(name)}</span>
          <span class="badge badge-computing">&hellip;</span>
        </summary>
        <div class="diff-table-body"></div>
      </details>`,
			)
			.join('');

	// Render skeleton immediately — no computation yet
	container.innerHTML =
		`<div class="diff-summary" id="diff-badges">
      <span class="badge badge-computing">Computing summaries&hellip;</span>
    </div>
    <h3 class="diff-section-heading">Calculated</h3>` +
		renderSection(calculated, 0) +
		`<h3 class="diff-section-heading">Tables</h3>` +
		renderSection(tables, calculated.length);

	// Set up lazy-load detail on expand
	container.querySelectorAll('.diff-table-section').forEach((details) => {
		let loaded = false;
		details.addEventListener('toggle', () => {
			if (!details.open || loaded) return;
			loaded = true;
			const tableName = details.dataset.table;
			const body = details.querySelector('.diff-table-body');
			body.innerHTML = '<div class="diff-loading">Computing diff&hellip;</div>';
			requestAnimationFrame(() => {
				const detail = diffTableDetail(fontA.data, fontB.data, tableName);
				body.innerHTML = renderSideBySide(detail.diffParts);
			});
		});
	});

	// Compute summaries one table at a time, yielding between each
	computeSummariesAsync(fontA.data, fontB.data, allNames, run);
}

async function computeSummariesAsync(dataA, dataB, tableNames, run) {
	const counts = { modified: 0, identical: 0, onlyA: 0, onlyB: 0 };

	for (let i = 0; i < tableNames.length; i++) {
		if (run !== currentRun) return;
		// Yield to main thread so the UI stays responsive
		await new Promise((r) => setTimeout(r, 0));
		if (run !== currentRun) return;

		const result = computeTableSummary(dataA, dataB, tableNames[i]);

		// Update this table's header in the DOM
		const section = container.querySelector(`[data-idx="${i}"]`);
		if (section) {
			section.dataset.table = result.tableName;
			const header = section.querySelector('.diff-table-header');
			header.innerHTML = `
        <span class="table-name">${escapeHtml(result.tableName)}</span>
        <span class="badge badge-${result.status}">${formatStatus(result.status)}</span>
        <span class="diff-line-counts">
          ${result.summary.added ? `<span class="count-added">+${result.summary.added}</span>` : ''}
          ${result.summary.removed ? `<span class="count-removed">-${result.summary.removed}</span>` : ''}
        </span>`;
		}

		if (result.status === 'modified') counts.modified++;
		else if (result.status === 'identical') counts.identical++;
		else if (result.status === 'only-a') counts.onlyA++;
		else if (result.status === 'only-b') counts.onlyB++;
	}

	if (run !== currentRun) return;

	// Final summary badges
	const badges = container.querySelector('#diff-badges');
	if (badges) {
		badges.innerHTML = `
      <span class="badge badge-modified">${counts.modified} differences</span>
      <span class="badge badge-identical">${counts.identical} identical</span>
      ${counts.onlyA ? `<span class="badge badge-only-a">${counts.onlyA} only in A</span>` : ''}
      ${counts.onlyB ? `<span class="badge badge-only-b">${counts.onlyB} only in B</span>` : ''}`;
	}
}

function renderSideBySide(parts) {
	// Build left (A) and right (B) line arrays from diff parts
	const leftLines = [];
	const rightLines = [];

	for (const part of parts) {
		const lines = part.value.replace(/\n$/, '').split('\n');
		if (part.removed) {
			for (const line of lines) {
				leftLines.push({ text: line, type: 'removed' });
				rightLines.push({ text: '', type: 'empty' });
			}
		} else if (part.added) {
			for (const line of lines) {
				leftLines.push({ text: '', type: 'empty' });
				rightLines.push({ text: line, type: 'added' });
			}
		} else {
			for (const line of lines) {
				leftLines.push({ text: line, type: 'unchanged' });
				rightLines.push({ text: line, type: 'unchanged' });
			}
		}
	}

	const maxLines = Math.max(leftLines.length, rightLines.length);
	let rows = '';
	for (let i = 0; i < maxLines; i++) {
		const left = leftLines[i] || { text: '', type: 'empty' };
		const right = rightLines[i] || { text: '', type: 'empty' };
		rows += `<tr>
      <td class="line-num">${left.type !== 'empty' ? i + 1 : ''}</td>
      <td class="diff-cell diff-${left.type}">${escapeHtml(left.text)}</td>
      <td class="line-num">${right.type !== 'empty' ? i + 1 : ''}</td>
      <td class="diff-cell diff-${right.type}">${escapeHtml(right.text)}</td>
    </tr>`;
	}

	return `<table class="diff-side-by-side"><tbody>${rows}</tbody></table>`;
}

function formatStatus(status) {
	switch (status) {
		case 'identical':
			return 'Identical';
		case 'modified':
			return 'Differences';
		case 'only-a':
			return 'Only in A';
		case 'only-b':
			return 'Only in B';
		default:
			return status;
	}
}

function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
