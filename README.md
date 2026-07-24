# FeedSort Pro

**FeedSort Pro** is a modern, high-performance Chrome extension for Instagram analytics, sorting, performance ranking, and media organization.

Sort Instagram feeds, reels, hashtag pages, and search results by engagement, analyze performance metrics with intelligent visual badges, export rich analytics to Excel, and download media seamlessly — all directly on `https://www.instagram.com/*`.

---

## Key Features

- **Selective Performance Ranking**: Human-friendly visual ranking badges (`Top Performer`, `Most Engaged`, `Most Liked`, `Most Viewed`, `Trending`, `Best Reach`, `Rising Post`, `High Performer`) powered by logarithmic normalization.
- **Multi-Select Performance Filters**: Filter media cards by performance badge categories (`Trending + Rising`, `Top Performer`, `No Badge`), performance score (0–100), overall rank limits (Top 3, Top 5, Top 10), and engagement rate ranges.
- **Live Network & Media Capture**: Intercepts media objects in real-time to analyze engagement rates and metrics.
- **On-Post Stat Overlays**: Displays unobtrusive stats, engagement badges, and quick download buttons directly on Instagram posts across home feed, explore, reels, and profiles.
- **Compact Side Panel Utility**: High-density browser utility interface built for fast sorting, date range filtering, search, and bulk operations.
- **Bulk Media Downloader**: Download images, videos, and carousel slides with progress tracking.
- **Excel Analytics Exporter**: Export complete media analytics to `.xlsx` spreadsheets including engagement rates, performance scores, overall ranks, like counts, view counts, and post URLs.
- **Continuous Auto-Scroll**: Hands-free feed scrolling with instant cancel control.
- **Custom Engagement Formulas**: Configurable weights for likes, comments, and reposts.

---

## Tech Stack

| Component | Technology |
| --- | --- |
| Extension Manifest | Chrome Manifest V3 |
| Framework | [WXT](https://wxt.dev) |
| Core Language | TypeScript (`strict`) |
| UI Framework | React 18 + Tailwind CSS |
| Grid Virtualization | `@tanstack/react-virtual` |
| Spreadsheet Engine | `exceljs` |
| Icon Library | `lucide-react` |

---

## Getting Started

### Installation & Development

```bash
# Install dependencies & prepare icons
npm install

# Run development mode with HMR (Chrome)
npm run dev

# Build production extension (.output/chrome-mv3)
npm run build

# Package extension zip for release
npm run zip

# Type-check TypeScript
npm run compile
```

### Loading Unpacked in Chrome

1. Run `npm run build`.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the `.output/chrome-mv3` directory.
5. Navigate to `https://www.instagram.com/` and open the **FeedSort Pro** side panel.

---

## Permissions

- **Permissions**: `activeTab`, `storage`, `sidePanel`
- **Host Permissions**: `https://www.instagram.com/*`

*No remote code, no external analytics, no telemetry, and no third-party tracking.*

---

## License & Disclaimer

Distributed under the MIT License.

*FeedSort Pro is an independent project and is not affiliated with, authorized, maintained, sponsored, or endorsed by Instagram, Meta Platforms, Inc., or any of its affiliates.*
