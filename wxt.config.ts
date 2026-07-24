import { defineConfig } from 'wxt';

// WXT configuration.
// - srcDir 'src' keeps entrypoints + modules under src/ per the requested architecture.
// - The React module wires up the JSX runtime + Fast Refresh for the side panel.
// - Content scripts (MAIN + ISOLATED worlds) are declared in their own entrypoint
//   files via defineContentScript; WXT merges them into the generated MV3 manifest.
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'FeedSort Pro',
    description:
      'Sort Instagram feed/reels/hashtag/search, analyze engagement rates, bulk download media, and export analytics to Excel.',
    // ExtPay stripped — no payment/host permissions needed beyond Instagram.
    permissions: ['activeTab', 'storage', 'sidePanel'],
    host_permissions: ['https://www.instagram.com/*'],
    action: {
      default_title: 'FeedSort Pro',
      default_icon: {
        16: '/icons/16.png',
        32: '/icons/32.png',
        48: '/icons/48.png',
        128: '/icons/128.png',
      },
    },
    icons: {
      16: '/icons/16.png',
      32: '/icons/32.png',
      48: '/icons/48.png',
      128: '/icons/128.png',
    },
  },
});
