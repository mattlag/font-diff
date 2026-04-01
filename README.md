# Font Diff

Drop two fonts to see their differences, both visually and data-ly

## Features

- **Drag-and-drop loading** — drop one or two font files at once (`.ttf`, `.otf`, `.woff`, `.woff2`, `.ttc`, `.otc`)
- **Font collection support** — TTC/OTC files show a dropdown to pick any font index
- **Data diff** — side-by-side comparison of every OpenType table, split into Calculated (font, glyphs, kerning) and raw Tables sections
- **Async diffing** — summaries stream in one table at a time; detail loads on expand, so the UI never blocks
- **Visual overlay** — renders both fonts on a canvas with toggleable red/blue layers and pixel-overlap stats
- **Word-wrapped preview** — multi-line textarea with adjustable font size for the visual comparison

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and drop two font files onto the load zones.

## Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start Vite dev server    |
| `npm run build`   | Build to `dist/`         |
| `npm run preview` | Preview production build |
| `npm test`        | Run tests with Vitest    |

## Tech Stack

- [Vite](https://vitejs.dev/) — build tooling
- [font-flux-js](https://github.com/user/font-flux-js) — font parsing
- [jsdiff](https://github.com/kpdecker/jsdiff) — line-level text diffing
- Vanilla JS + Plain CSS — no framework
