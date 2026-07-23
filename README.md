# IG Sorter & Analytics Pro

A modern, from-scratch rebuild of the "IG Sorter — Sort Feed" browser extension.
It sorts Instagram feed / reels / hashtag / search posts, analyzes engagement
rates, renders on-post stat overlays, bulk-downloads media, and exports
analytics to Excel — all on `https://www.instagram.com/*`.

This is a **Manifest V3** extension built with **WXT + TypeScript (strict) +
React 18 + Tailwind CSS**, virtualized with **@tanstack/react-virtual** and
exporting via **ExcelJS**. It is the **Free Edition**: every feature is
unlocked (the original's ExtPay licensing has been removed).

> Feature parity target: v2.3.9 of the original extension. See
> `docs/PARITY.md`-style notes in the project thread for the reverse-engineered
> contract (message names, storage keys, endpoints, data model).

---

## Features

- **Network capture** — patches `fetch` **and** `XMLHttpRequest` at
  `document_start` in the MAIN world to parse Instagram's GraphQL/REST media
  objects, plus inline JSON preloads, into a typed model.
- **On-post overlays** — a `MutationObserver` draws likes / comments / reposts /
  date / views / ER badges onto posts across feed, explore, reels and profiles,
  with one-click image / carousel / video download buttons.
- **Side panel** (`sidePanel` API) — header + settings, access bar, bulk
  downloader, automation controls, filter/sort bar, and a virtualized grid.
- **Sort & filter** — date ranges (7d…10y) and multi-criteria sort (likes,
  comments, reposts, date, views, ER, default).
- **Bulk download engine** — sequential image/carousel/video downloads with a
  live multi-line progress banner.
- **Excel export** — `.xlsx` with embedded thumbnails and hyperlinks.
- **Cancellable auto-scroll** — Swipe 1 / 10 / 30 with human-like 3–8 s gaps and
  an instant **Stop Scrolling** cancel.
- **Custom ER weights** — configurable like/comment/repost weights with a live
  formula preview; ER recomputes across all captured posts.

## Tech stack

| Concern        | Choice                          |
| -------------- | ------------------------------- |
| Manifest       | MV3                             |
| Framework      | [WXT](https://wxt.dev)          |
| Language       | TypeScript (`strict`)           |
| UI             | React 18 + Tailwind CSS         |
| Virtualization | `@tanstack/react-virtual`       |
| Excel          | `exceljs`                       |
| Icons          | `lucide-react`                  |

## Project structure

```
ig-sorter-rebuild/
├── wxt.config.ts                 # WXT config (srcDir: src, React module, manifest)
├── tailwind.config.js
├── src/
│   ├── entrypoints/
│   │   ├── background.ts                    # service worker (side panel + relay)
│   │   ├── mainWorldInterceptor.content.ts  # MAIN world: network + overlay + downloader
│   │   ├── isolatedBridge.content.ts        # ISOLATED world: runtime broker + scroll
│   │   └── sidepanel/                        # React side panel (index.html, App, components, store)
│   ├── content/                  # MAIN-world logic modules
│   │   ├── mediaStore.ts         # capture store + indexes
│   │   ├── mediaParser.ts        # raw payload → InstagramMediaItem, endpoint parsers
│   │   ├── preloadScanner.ts     # inline JSON preload scanning
│   │   ├── fiber.ts              # React Fiber shortcode resolution
│   │   ├── overlayEngine.ts      # MutationObserver overlay rendering
│   │   └── headers.ts            # x-ig-app-id capture
│   └── shared/
│       ├── types/                # instagram.ts (model) + messages.ts (protocol)
│       └── utils/                # engagement, sort/filter, downloader, excel, scroll, format
└── package.json
```

## Getting started

```bash
npm install          # installs deps and runs `wxt prepare`
npm run dev          # dev build with HMR (Chrome)
npm run build        # production build → .output/chrome-mv3
npm run zip          # zip the production build for distribution
npm run compile      # type-check only (tsc --noEmit)
```

### Load the unpacked extension

1. `npm run build`
2. Open `chrome://extensions` and enable **Developer mode**.
3. **Load unpacked** → select `.output/chrome-mv3`.
4. Open `https://www.instagram.com/`, then click the extension icon to open the
   side panel. Scroll (or use the swipe buttons) to capture posts.

> **Note:** Instagram's internal API shapes and DOM structure are undocumented
> and change frequently. If capture stops working after an Instagram update, the
> selectors/paths in `src/content/mediaParser.ts`, `preloadScanner.ts` and
> `overlayEngine.ts` are where fixes go.

## Permissions

- `activeTab`, `storage`, `sidePanel`
- Host: `https://www.instagram.com/*`

No remote code, no analytics, no payment SDK.

## License

For personal/educational use. Instagram is a trademark of its respective owner;
this project is not affiliated with or endorsed by Instagram/Meta.
