# Engagement Counts Refactor (React State Instead of DOM Mutation)

This doc outlines a staged refactor to replace direct DOM updates in `updatePostEngagementCounts` with React/valtio state. The goal is better performance and consistency across windows.

## Why change it
- Current DOM mutation via `querySelectorAll` + `textContent` bypasses React and can desync UI state.
- It scales poorly with many posts/windows.
- React state updates are predictable and easier to maintain.

## Proposed Approach (Incremental)

### 1) Introduce a shared engagement store
Create a `valtio` store keyed by status id:

```
// src/store/engagementStore.ts
import { proxy } from 'valtio';

export interface EngagementState {
  favourites_count: number;
  reblogs_count: number;
  replies_count: number;
  favourited: boolean;
  reblogged: boolean;
  emoji_reactions?: EmojiReaction[];
}

export const engagementStore = proxy<Record<string, EngagementState>>({});

export const upsertEngagement = (status: Status) => {
  engagementStore[status.id] = {
    favourites_count: status.favourites_count,
    reblogs_count: status.reblogs_count,
    replies_count: status.replies_count,
    favourited: status.favourited,
    reblogged: status.reblogged,
    emoji_reactions: getEmojiReactions(status)
  };
};
```

### 2) Change `updatePostEngagementCounts` to update the store
- Keep the function signature so existing call sites don’t break.
- Internally, **don’t** query or mutate the DOM.
- Normalize reblogs to original status (as currently done).
- Call `upsertEngagement(status)` for each status.

### 3) Update `PostComponent` to read from the store
- Use `useSnapshot(engagementStore)`.
- For a given post id, prefer store values; fallback to `localStatus` if missing.
- Replace DOM-based emoji update listener with store-based rendering.

### 4) Remove DOM mutation & event dispatching
- Once store integration is working, delete the DOM updates and `emojiReactionsUpdate` event dispatch.

### 5) Verify all update paths write to the store
- Timeline fetches
- Conversation fetch
- Notifications fetch
- Emoji react / favorite / reblog / bookmark actions

## Full Refactor (Future)
- Remove `updatePostEngagementCounts` entirely, call `upsertEngagement` directly.
- Remove any remaining DOM-based update logic.
- Consider moving action handlers to also update the store optimistically.

## Files Likely Touched
- `src/utils/postUpdates.ts` (refactor / retire)
- `src/store/engagementStore.ts` (new)
- `src/components/PostComponent.tsx` (render from store)
- `src/components/*TimelineWindow.tsx` (ensure upsert on fetch)
- `src/components/ConversationWindow.tsx`
- `src/components/NotificationsWindow.tsx`

## Rollout Suggestion
1) Add engagement store + modify `updatePostEngagementCounts` to update store only.
2) `PostComponent` reads store values, fallback to props.
3) Remove DOM mutation and custom event wiring.

