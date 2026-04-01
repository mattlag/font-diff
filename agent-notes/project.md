# Project Overview

This project will provide an app that makes it very easy to see the differences between two font files. The user can drag and drop or load two different font files, then see the differences between the data that gets loaded from them. In addition to font file data, there will be a section where the two fonts will be visually overlaid on top of each other so that visual differences can be highlighted as well.

# Tech

- Use Vite, Vitest, and Vitepress if needed
- Use font-flux-js for loading font data: https://github.com/mattlag/Font-Flux-JS
- Use jsdiff (the `diff` npm package) for computing data diffs
- Vanilla JS and plain CSS — no UI framework
- `npm run build` produces a bundled app in `dist/` for easy deployment to a web server

# Organization

- All source code lives in `src/`, organized so a human can easily understand the file structure:
  - `src/main.js` — entry point, tab routing, app init
  - `src/style.css` — global styles
  - `src/state.js` — shared app state (two loaded fonts, callbacks)
  - `src/tabs/` — one module per tab (load.js, diff.js, visual.js)
  - `src/utils/` — shared utilities (font-loader.js, differ.js, pixel-diff.js)
- `index.html` at root — app shell with tab bar

# App

- App will be a single page app with three "L1" tabs across the top:
  - "Load", which will accept two file inputs (either drag and drop or launch a file browser). For font collections (TTC/OTC), default to the first font in the collection, but show a dropdown to let the user switch. Show a loading animation while parsing, especially for large fonts. Display font metadata once loaded: family name, style, glyph count, file size.
  - "Diff", which will be a side-by-side diff view of the font tables and their data, using jsdiff. The diff view should be broken down by table, and some sort of summary about table-level difference should be surfaced. Tables should be expandable / collapsible.
  - "Visual", which will have an input for source text. This source text will then be drawn to a canvas twice and overlapping, once from each loaded font. Some transparency and different colors will make it easy to see overlaps. A pixel analysis will be done about how much they do or don't overlap. Basic text size controls will be shown next to the text input.

# Additional Details

- Diff and Visual tabs are disabled until both fonts are loaded
- WOFF2 support: call `initWoff2()` at app startup
- Use the `FontFace` API to register loaded fonts for canvas rendering on the Visual tab
- Font file types accepted: .ttf, .otf, .woff, .woff2, .ttc, .otc
