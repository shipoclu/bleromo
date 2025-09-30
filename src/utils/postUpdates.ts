interface Status {
  id: string;
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  reblogged: boolean;
  favourited: boolean;
}

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const updatePostEngagementCounts = (statuses: Status[], sourceWindow?: string) => {
  let totalUpdatesCount = 0;
  let windowUpdates: Record<string, number> = {};
  
  // Log posts with favourites/reblogs received
  const postsWithEngagement = statuses.filter(status => 
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

  statuses.forEach(status => {
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
        reblogsElement.style.color = status.reblogged ? '#008000' : '#808080';
      }

      // Update favourites count and color
      const favouritesElement = postElement.querySelector('[data-favourites-count]') as HTMLElement;
      if (favouritesElement) {
        favouritesElement.textContent = `⭐ ${formatNumber(status.favourites_count)}`;
        favouritesElement.style.color = status.favourited ? '#ff0000' : '#808080';
      }
    });
  });

  if (totalUpdatesCount > 0) {
    console.log(`🔄 Updated ${totalUpdatesCount} post elements across windows:`, windowUpdates);
  }
};