import { version } from '../../package.json';

export function initInfoTab(container) {
	container.innerHTML = `
    <div class="info-page">
      <div class="info-hero">
        <h2 class="info-title">Font Diff</h2>
        <p class="info-tagline">Drop two fonts to see their differences, both visually and data-ly</p>
        <p class="info-description">
          Font Diff is a browser-based tool for comparing OpenType and TrueType font files.
          Load two fonts to get a side-by-side data diff of every table, plus a visual
          pixel overlay to see exactly where the outlines diverge.
        </p>
        <p class="info-version">Version ${version}</p>
      </div>
      <div class="info-footer">
        Font Diff is a member of the <strong>Glyphr Studio</strong> family.
        You can raise issues on the
        <a href="https://github.com/mattlag/font-diff" target="_blank" rel="noopener">GitHub page</a>,
        or reach out to
        <a href="mailto:mail@glyphrstudio.com">mail@glyphrstudio.com</a>
        — we always love hearing feedback and answering questions!
      </div>
    </div>
  `;
}
