# FeedSort Pro — Privacy Policy

**Effective Date:** July 24, 2026  
**Extension Name:** FeedSort Pro  
**Version:** 2.4.0  

FeedSort Pro is committed to respecting and protecting user privacy. This Privacy Policy details how FeedSort Pro processes data, handles extension permissions, and ensures total user privacy.

---

## 1. Zero External Data Collection

FeedSort Pro operates **100% locally within your Chrome browser**.

- **No Remote Servers:** FeedSort Pro does not own, operate, or communicate with any external analytics server, tracking domain, or remote backend database.
- **No Telemetry or Tracking:** FeedSort Pro does not track user behavior, page history, search queries, IP addresses, or personal identity.
- **No Third-Party Data Sharing:** No captured data or metadata is ever transmitted, sold, rented, or shared with third parties.

---

## 2. Information Handled Locally

All data processed by FeedSort Pro remains in local browser memory and storage:

1. **Instagram Media Metadata:** Shortcodes, captions, timestamps, media URLs, like counts, comment counts, play counts, and creator usernames are read directly from your active Instagram browsing session to compute engagement metrics, rank posts, and display visual performance badges in your side panel. This data exists solely in transient browser memory while the tab or side panel is open.
2. **Local User Settings:** Custom preferences (such as overlay display modes, engagement formula weights, and performance badge display options) are stored locally on your device using Chrome’s `chrome.storage.local` API.

---

## 3. Chrome Extension Permissions Justification

FeedSort Pro requests only the minimal necessary permissions required to deliver its core media sorting and download features:

| Permission | Purpose & Justification |
| :--- | :--- |
| `storage` | Stores user preference settings (overlay modes, engagement weights, badge display modes) locally on your device. |
| `sidepanel` | Renders the FeedSort Pro grid, sorter, and performance dashboard inside Google Chrome’s native side panel. |
| `activeTab` | Allows FeedSort Pro to interact with the active Instagram tab when you invoke scroll, refresh, or media capture commands. |
| `declarativeNetRequest` | Allows the extension to safely modify header rules necessary for capturing public Instagram GraphQL API responses and downloading media. |
| **Host Permissions** (`https://www.instagram.com/*`, `https://*.cdninstagram.com/*`, `https://*.fbcdn.net/*`) | Enables content scripts on Instagram web pages to display overlay badges, seed preload data, and fetch media directly from Meta’s official media distribution CDNs. |

---

## 4. Single-Purpose Compliance

FeedSort Pro serves a single, narrow purpose: providing post sorting, engagement rate analysis, visual performance badges, media downloading, and Excel analytics export for Instagram media.

---

## 5. Contact & Support

If you have any questions or concerns regarding this Privacy Policy or FeedSort Pro, please visit our official repository:

- **Repository:** [https://github.com/AbdullahAlMuti/ig](https://github.com/AbdullahAlMuti/ig)  
- **Maintainer:** Md Abdullah Al Muti
