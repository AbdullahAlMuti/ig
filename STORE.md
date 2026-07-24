# FeedSort Pro — Chrome Web Store Submission & Publishing Kit

This document contains publication materials, store listings, single-purpose justifications, and reviewer testing instructions for submitting FeedSort Pro to the Chrome Web Store.

---

## 1. Extension Basic Information

- **Extension Title:** FeedSort Pro — Instagram Feed Sorter & Analytics
- **Short Name:** FeedSort Pro
- **Version:** 2.4.0
- **Category:** Productivity / Social & Communication
- **Short Description (max 132 characters):**
  > Sort Instagram feeds & reels by engagement rate, likes, views & comments. Filter top performers, bulk download media & export to Excel.

---

## 2. Chrome Web Store Detailed Description

```markdown
FeedSort Pro is the ultimate productivity side-panel extension for creators, social media managers, and researchers analyzing Instagram content performance.

Effortlessly sort, filter, rank, download, and export public Instagram media across feeds, reels, explore pages, profiles, and hashtag feeds in real time.

==================================================
KEY FEATURES
==================================================

1. VISUAL PERFORMANCE RANKING SYSTEM
   - Replace complex metrics with human-friendly performance badges:
     • Top Performer (Crown) — Highest overall performance in selection
     • Most Engaged (⚡) — Highest calculated engagement rate
     • Most Liked (❤️) — Highest like count
     • Most Viewed (👁️) — Highest video play count
     • Best Reach (🎯) — Reached largest overall audience
     • Trending (🔥) — Fast-growing recent velocity
     • Rising Post (🚀) — High early trajectory (published <72 hrs)
     • High Performer (⭐) — Top 15% overall performance score
   - Logarithmic metric scaling guarantees fair evaluation across both viral reels and smaller niche posts.

2. MULTI-SELECT PERFORMANCE FILTERING
   - Instantly filter media by badge classifications, minimum score, rank limits, or custom engagement rate thresholds using compact popovers and removable chips.

3. MULTI-CRITERIA SORTING & DATE RANGES
   - Sort posts instantly by Likes, Comments, Views, Engagement Rate, Date, or Default captured order.
   - Filter content by date range: Last 24 Hours, 7 Days, 30 Days, 3 Months, 6 Months, or 1 Year.

4. BULK & SINGLE MEDIA DOWNLOADS
   - Download high-resolution photos, multi-slide carousels, and HD videos directly to your computer.
   - Smart 1-indexed carousel naming (`shortcode_1.jpg`, `shortcode_2.jpg`) and concurrency limits (max 3 concurrent transfers) ensure fast, reliable downloads.

5. ONE-CLICK EXCEL ANALYTICS EXPORT
   - Export full post metadata, captions, timestamps, metrics, engagement rates, performance ranks, and direct media URLs to formatted Excel (.xlsx) spreadsheets.

6. ON-POST OVERLAYS
   - Display compact, customizable performance badges directly on Instagram post cards while browsing.

==================================================
PRIVACY & SECURITY
==================================================
- 100% Client-Side Processing: All metadata capture, engagement math, and file rendering occur locally inside your Chrome browser.
- No External Servers: Zero data is sent to remote databases, tracking services, or third parties.
- Minimal Permissions: Only requires host access to Instagram and Meta CDNs for displaying overlays and downloading media.
```

---

## 3. Chrome Web Store Single-Purpose Justification

> **Single-Purpose Statement:**  
> FeedSort Pro serves a single, focused purpose: empowering users to analyze, visually rank, filter, download, and export Instagram media metadata directly within Chrome's side panel. All features (sorting, filtering badges, media downloading, Excel export, and on-post overlays) serve this single analytics and curation purpose.

---

## 4. Single-Purpose Permission Justifications

| Permission | Reviewer Justification |
| :--- | :--- |
| `storage` | Required to persist local user settings (overlay display modes, custom engagement formula weights, badge display modes) locally across browser sessions. |
| `sidepanel` | Required to host the primary FeedSort Pro user interface in Chrome's native side panel. |
| `activeTab` | Required to trigger auto-scroll, tab refresh, and media capture commands when initiated by the user. |
| `declarativeNetRequest` | Required to safely modify network rules for capturing public GraphQL responses and downloading Instagram media. |
| `https://www.instagram.com/*` | Required to inject content scripts into Instagram pages to capture media metadata and display performance overlays. |
| `https://*.cdninstagram.com/*` & `https://*.fbcdn.net/*` | Required to download image and video media directly from Meta's official media CDNs when requested by the user. |

---

## 5. Reviewer Test & Verification Instructions

### How to Test FeedSort Pro:

1. **Installation:**
   - Load the unpacked extension folder from `.output/chrome-mv3` in `chrome://extensions` (Developer mode enabled).
   - Alternatively, install the generated zip `.output/feedsort-pro-2.4.0-chrome.zip`.

2. **Opening the Side Panel:**
   - Navigate to `https://www.instagram.com/explore/` or any Instagram profile/feed.
   - Click the FeedSort Pro extension icon in the Chrome toolbar to open the Side Panel.

3. **Capturing & Sorting Content:**
   - As you scroll on Instagram, media items automatically stream into the side panel.
   - Change the Sort dropdown to **Likes**, **Views**, or **Engagement Rate** to verify sorting.
   - Change the Date Filter to **Last 30 Days** to verify date filtering.

4. **Testing Performance Badges & Filtering:**
   - Click the **Performance** filter popover button.
   - Select **Top Performer** or **Most Engaged** to verify multi-select performance badge filtering.
   - Removable chips will appear above the grid allowing single-click filter removal.

5. **Testing Media Downloads & Excel Export:**
   - Click **Download** to trigger single or bulk download of captured media.
   - Click **Export** to generate and download an Excel spreadsheet (`.xlsx`) containing post analytics.

6. **Settings Dialog:**
   - Click the gear icon (`⚙`) in the header to open settings.
   - Toggle badge display modes and customize ER weights (Likes, Comments, Reposts). Click **Save** to verify local storage persistence.
