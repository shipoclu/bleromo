# Emoji Picker Performance & Caching Improvements

This document outlines the steps to make the emoji picker feel instant while avoiding unbounded RAM growth. The API only provides a full emoji list, but image loading can still be staged.

## Goals
- Keep the emoji picker responsive (fast search + instant render).
- Avoid large, permanent memory use from blob URLs.
- Keep “forever cache” semantics (images should stay fast across sessions).

## Proposed Changes

### 1) Keep full emoji list, but stage image prefetch
**Why:** The API returns the full list, but image loading can be prioritized.

**Steps:**
- Keep `customEmojiCache` and `customEmojiCacheTimestamp` as-is for list caching.
- Replace `preloadEmojiImages(...)` with a staged prefetch system:
  - **Tier 1:** Preload emojis that are visible in the initial grid (first viewport).
  - **Tier 2:** Preload emojis that match the current search results.
  - **Tier 3 (background):** Preload all remaining emojis in small batches.
- Use `requestIdleCallback` if available; otherwise fall back to `setTimeout` with small delays.
- Add a concurrency limit (e.g., 6–10 in-flight loads) to avoid blocking the main thread.

### 2) Prefer browser HTTP cache over blob URLs
**Why:** `fetch → blob → createObjectURL` keeps large blobs in JS memory forever.

**Steps:**
- Stop creating blob URLs for emoji images.
- Use a warm-up strategy instead:
  - `const img = new Image(); img.src = emojiUrl;`
  - Optionally use `img.decode()` if supported for faster paint when shown.
- Rely on the browser’s disk cache for persistence across sessions.

### 3) Virtualize the emoji grid (optional but highly recommended)
**Why:** Rendering thousands of `<img>` nodes is expensive.

**Steps:**
- Implement a simple windowed grid (only render visible rows + a small buffer).
- Keep the full emoji list in memory but only mount ~200–400 DOM nodes.
- Recalculate visible indices on scroll.

### 4) Add usage-based priority prefetch
**Why:** The picker should be instant for commonly used emojis.

**Steps:**
- Track emoji usage in `localStorage` (e.g., `emojiUsage[shortcode]++`).
- Sort or prioritize prefetch for top N most used emojis.
- Optionally show a “Recent” section at the top of the picker.

### 5) Bound the prefetch queue (no runaway work)
**Why:** Avoid prefetching thousands of images at once.

**Steps:**
- Use a queue system:
  - `pending` array of emoji URLs.
  - `inFlight` counter.
  - `scheduleNextBatch()` called by idle callback / timeout.
- Mark URLs as “requested” to avoid duplicates.

## Implementation Notes

- The emoji list itself can still be cached for 5 days as today.
- Staged prefetch does **not** require API changes.
- If blob URLs are retained for some reason, add a hard cap + manual `revokeObjectURL` for eviction.

## Suggested Order of Work
1. Replace blob URL cache with HTTP cache warm-up.
2. Add staged prefetch queue (visible → search → background).
3. Add usage-based priority.
4. Add grid virtualization if emoji list is large.

## Files Likely Touched
- `src/components/EmojiReactPickerWindow.tsx`
- (Optional) Add a `useEmojiPrefetch` helper in `src/utils/`.

