# Public Frontend

Performance-focused changes included:
- Defer loading of non-critical scripts and conditional eruda loading via `?debug=1` or `localStorage.eruda = 'true'`.
- Lazy load images/iframes and set video `preload=metadata`.
- Added preconnect/dns-prefetch for external CDNs.
- Added service worker registration (`/sw.js`) for basic static asset caching.
- Gated particle effects by `prefers-reduced-motion` and `navigator.connection.saveData`.
- Added `prefers-reduced-motion` CSS to reduce heavy animations.

To enable eruda console on admin: append `?debug=1` to `admin.html` or run in console: `localStorage.setItem('eruda','true'); location.reload()`.