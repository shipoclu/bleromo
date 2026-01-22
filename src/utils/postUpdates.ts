interface EmojiReaction {
  name: string;
  count: number;
  me: boolean;
  url?: string;
}

interface Status {
  id: string;
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  reblogged: boolean;
  favourited: boolean;
  sensitive: boolean;
  reblog?: Status;
  emoji_reactions?: EmojiReaction[];
  pleroma?: {
    emoji_reactions?: EmojiReaction[];
    [key: string]: any;
  };
}

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Helper function to get emoji reactions from the correct location
const getEmojiReactions = (status: Status): EmojiReaction[] => {
  // First check if they're in the pleroma field (Pleroma/Akkoma)
  if (status.pleroma?.emoji_reactions) {
    return status.pleroma.emoji_reactions;
  }
  // Fallback to direct field (other implementations)
  return status.emoji_reactions || [];
};

export const updatePostEngagementCounts = (statuses: Status[], sourceWindow?: string) => {
  const normalizedStatuses = statuses.map(status => status.reblog ?? status);
  const uniqueStatuses = new Map<string, Status>();
  normalizedStatuses.forEach(status => {
    uniqueStatuses.set(status.id, status);
  });
  const dedupedStatuses = Array.from(uniqueStatuses.values());

  let totalUpdatesCount = 0;
  let windowUpdates: Record<string, number> = {};
  
  // Log posts with favourites/reblogs received
  const postsWithEngagement = dedupedStatuses.filter(status => 
    status.favourites_count > 0 || status.reblogs_count > 0 || status.favourited || status.reblogged
  );
  
  if (postsWithEngagement.length > 0) {
    console.log(`📊 Engagement data received${sourceWindow ? ` from ${sourceWindow}` : ''}:`, 
      postsWithEngagement.map(status => ({
        id: status.id,
        favourites: status.favourites_count,
        reblogs: status.reblogs_count,
        favourited: status.favourited,
        reblogged: status.reblogged
      }))
    );
  }

  dedupedStatuses.forEach(status => {
    // Find all posts with this ID across all windows
    const postElements = document.querySelectorAll(`[data-post-id="${status.id}"]`);
    
    if (postElements.length > 0) {
      totalUpdatesCount += postElements.length;
      
      // Track which windows contain these posts
      postElements.forEach(postElement => {
        // Try to identify the window by looking for parent window containers
        let windowType = 'unknown';
        const timelineContainer = postElement.closest('[data-window-type]');
        if (timelineContainer) {
          windowType = timelineContainer.getAttribute('data-window-type') || 'unknown';
        } else {
          // Try to identify by nearby elements
          const parentContainer = postElement.closest('div[style*="backgroundColor"]');
          if (parentContainer) {
            const titleElements = document.querySelectorAll('div[title]');
            for (const titleEl of titleElements) {
              if (titleEl.contains(postElement)) {
                const title = titleEl.getAttribute('title');
                if (title?.includes('Timeline')) windowType = title;
                else if (title?.includes('Notification')) windowType = 'Notifications';
                else if (title?.includes('Conversation')) windowType = 'Conversation';
                break;
              }
            }
          }
        }
        
        windowUpdates[windowType] = (windowUpdates[windowType] || 0) + 1;
      });
    }
    
    postElements.forEach(postElement => {
      // Update replies count
      const repliesElement = postElement.querySelector('[data-replies-count]');
      if (repliesElement) {
        repliesElement.textContent = `↩️ ${formatNumber(status.replies_count)}`;
      }

      // Update reblogs count and color
      const reblogsElement = postElement.querySelector('[data-reblogs-count]') as HTMLElement;
      if (reblogsElement) {
        reblogsElement.textContent = `🔄 ${formatNumber(status.reblogs_count)}`;
        reblogsElement.style.color = status.reblogged ? 'var(--win98-help-green)' : '#808080';
        reblogsElement.style.fontWeight = status.reblogged ? 'bold' : 'normal';
      }

      // Update favourites count and color
      const favouritesElement = postElement.querySelector('[data-favourites-count]') as HTMLElement;
      if (favouritesElement) {
        favouritesElement.textContent = `⭐ ${formatNumber(status.favourites_count)}`;
        favouritesElement.style.color = status.favourited ? 'var(--win98-help-green)' : '#808080';
        favouritesElement.style.fontWeight = status.favourited ? 'bold' : 'normal';
      }

      // Update emoji reactions - trigger a more comprehensive update by dispatching custom event
      const reactions = getEmojiReactions(status);
      
      // Dispatch a custom event that PostComponent can listen to for emoji reaction updates
      const emojiUpdateEvent = new CustomEvent('emojiReactionsUpdate', {
        detail: {
          statusId: status.id,
          reactions: reactions
        }
      });
      postElement.dispatchEvent(emojiUpdateEvent);
      
      // Also update existing reaction elements for backward compatibility
      if (reactions.length > 0) {
        reactions.forEach(reaction => {
          const reactionElement = postElement.querySelector(`[data-emoji-reaction="${reaction.name}"]`) as HTMLElement;
          if (reactionElement) {
            // Update the count text
            const countText = reactionElement.textContent;
            if (countText) {
              // Replace the count at the end of the text while preserving the emoji
              const newText = countText.replace(/\d+$/, formatNumber(reaction.count));
              reactionElement.textContent = newText;
            }
            // Update the color based on reaction state
            reactionElement.style.color = reaction.me ? 'var(--win98-help-green)' : '#808080';
            reactionElement.style.fontWeight = reaction.me ? 'bold' : 'normal';
          }
        });
      }
    });
  });

  if (totalUpdatesCount > 0) {
    console.log(`🔄 Updated ${totalUpdatesCount} post elements across windows:`, windowUpdates);
  }
};
