import React, { useEffect, useState } from 'react';
import { DesktopWindow, type WindowMoveEvent, type WindowResizeEvent } from 'wtkrjs';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';
import PostComponent from './PostComponent';
import { updatePostEngagementCounts } from '../utils/postUpdates';
import { useAbortControllers } from '../utils/useAbortControllers';

interface EmojiReaction {
  name: string;
  count: number;
  me: boolean;
  url?: string;
}

interface Status {
  id: string;
  created_at: string;
  account: {
    id: string;
    username: string;
    acct: string;
    display_name: string;
    avatar: string;
    url: string;
    emojis?: Array<{
      shortcode: string;
      url: string;
      static_url?: string;
      visible_in_picker?: boolean;
    }>;
  };
  content: string;
  visibility: 'public' | 'unlisted' | 'private' | 'direct';
  spoiler_text: string;
  sensitive: boolean;
  emojis?: Array<{
    shortcode: string;
    url: string;
    static_url?: string;
    visible_in_picker?: boolean;
  }>;
  media_attachments: Array<{
    id: string;
    type: 'image' | 'video' | 'audio' | 'unknown';
    url: string;
    preview_url: string;
    description?: string;
  }>;
  mentions: Array<{
    id: string;
    username: string;
    acct: string;
    url: string;
  }>;
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  reblogged: boolean;
  favourited: boolean;
  bookmarked?: boolean;
  reblog?: Status;
  url: string;
  emoji_reactions?: EmojiReaction[];
}

interface LocalTimelineWindowProps {
  id: string;
  onImageClick?: (imageUrl: string, description?: string) => void;
  onVideoClick?: (videoUrl: string, description?: string) => void;
  onAudioClick?: (audioUrl: string, description?: string) => void;
  onYouTubeClick?: (videoId: string, videoUrl: string) => void;
  onConversationClick?: (statusId: string) => void;
  onUserClick?: (userId: string) => void;
  onReplyClick?: (statusId: string, mentionHandles: string[]) => void;
  onEmojiPickerClick?: (statusId: string) => void;
  onRawPostClick?: (statusId: string, jsonData: any) => void;
  onClose: () => void;
  onFocus: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onMove: (event: WindowMoveEvent) => void;
  onResize: (event: WindowResizeEvent) => void;
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

const LocalTimelineWindow: React.FC<LocalTimelineWindowProps> = ({
  id,
  onImageClick,
  onVideoClick,
  onAudioClick,
  onYouTubeClick,
  onConversationClick,
  onUserClick,
  onReplyClick,
  onEmojiPickerClick,
  onRawPostClick,
  onClose,
  onFocus,
  onMinimize,
  onMaximize,
  onRestore,
  onMove,
  onResize,
  isFocused,
  isMinimized,
  isMaximized,
  zIndex
}) => {
  const snap = useSnapshot(appState);
  const { createController, releaseController, isMountedRef } = useAbortControllers();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxId, setMaxId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchTimeline = async (loadMore = false) => {
    if (!snap.accessToken || !snap.serverUrl) return;

    const controller = createController();
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams({
        limit: '20',
        local: 'true'
      });
      
      if (loadMore && maxId) {
        params.append('max_id', maxId);
      }

      const response = await fetch(`${snap.serverUrl}/api/v1/timelines/public?${params}`, {
        headers: {
          'Authorization': `Bearer ${snap.accessToken}`
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch local timeline: ${response.status}`);
      }

      const newStatuses: Status[] = await response.json();
      if (!isMountedRef.current || controller.signal.aborted) return;
      
      // Filter to only show notes and boosts (no other activity types)
      const filteredStatuses = newStatuses.filter(status => 
        status.reblog || (!status.reblog && status.content)
      );

      if (loadMore) {
        setStatuses(prev => [...prev, ...filteredStatuses]);
      } else {
        setStatuses(filteredStatuses);
      }

      // Set up pagination
      if (newStatuses.length > 0) {
        setMaxId(newStatuses[newStatuses.length - 1].id);
        // Only stop showing "Load More" if API returned no posts at all
        setHasMore(true);
      } else {
        // No posts returned from API - end of timeline
        setHasMore(false);
      }

      // Update engagement counts across all windows after a brief delay to ensure DOM is updated
      setTimeout(() => {
        if (!isMountedRef.current) return;
        updatePostEngagementCounts(newStatuses, 'Local Timeline');
      }, 100);

    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Error fetching local timeline:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      releaseController(controller);
      if (!controller.signal.aborted && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    setMaxId(null);
    setHasMore(true);
    fetchTimeline(false);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchTimeline(true);
    }
  };

  const handleFavoriteClick = async (statusId: string, currentlyFavorited: boolean): Promise<{ favourited: boolean; favourites_count: number }> => {
    if (!snap.accessToken || !snap.serverUrl) {
      throw new Error('Not authenticated');
    }

    const endpoint = currentlyFavorited ? 'unfavourite' : 'favourite';
    const response = await fetch(`${snap.serverUrl}/api/v1/statuses/${statusId}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${snap.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to ${endpoint} status: ${response.status}`);
    }

    const updatedStatus = await response.json();
    return {
      favourited: updatedStatus.favourited,
      favourites_count: updatedStatus.favourites_count
    };
  };

  const handleReblogClick = async (statusId: string, currentlyReblogged: boolean): Promise<{ reblogged: boolean; reblogs_count: number }> => {
    if (!snap.accessToken || !snap.serverUrl) {
      throw new Error('Not authenticated');
    }

    const endpoint = currentlyReblogged ? 'unreblog' : 'reblog';
    const response = await fetch(`${snap.serverUrl}/api/v1/statuses/${statusId}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${snap.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to ${endpoint} status: ${response.status}`);
    }

    const updatedStatus = await response.json();
    return {
      reblogged: updatedStatus.reblogged,
      reblogs_count: updatedStatus.reblogs_count
    };
  };

  const handleBookmarkClick = async (statusId: string, currentlyBookmarked: boolean): Promise<{ bookmarked: boolean }> => {
    if (!snap.accessToken || !snap.serverUrl) {
      throw new Error('Not authenticated');
    }

    const endpoint = currentlyBookmarked ? 'unbookmark' : 'bookmark';
    const response = await fetch(`${snap.serverUrl}/api/v1/statuses/${statusId}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${snap.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to ${endpoint} status: ${response.status}`);
    }

    const updatedStatus = await response.json();
    return {
      bookmarked: updatedStatus.bookmarked
    };
  };

  const handleEmojiReactClick = async (statusId: string, emojiName: string, currentlyReacted: boolean): Promise<EmojiReaction[]> => {
    if (!snap.accessToken || !snap.serverUrl) {
      throw new Error('Not authenticated');
    }

    const endpoint = currentlyReacted ? 'unreact' : 'react';
    const response = await fetch(`${snap.serverUrl}/api/v1/pleroma/statuses/${statusId}/reactions/${encodeURIComponent(emojiName)}`, {
      method: currentlyReacted ? 'DELETE' : 'PUT',
      headers: {
        'Authorization': `Bearer ${snap.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to ${endpoint} with ${emojiName}: ${response.status}`);
    }

    const updatedStatus = await response.json();
    return updatedStatus.emoji_reactions || [];
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  return (
    <DesktopWindow
      id={id}
      title="Local Timeline"
      initialPosition={{ x: 120, y: 70 }}
      initialSize={{ width: 500, height: 600 }}
      isFocused={isFocused}
      isMinimized={isMinimized}
      isMaximized={isMaximized}
      zIndex={zIndex}
      isMinimizable={true}
      isMaximizable={true}
      isClosable={true}
      isResizable={true}
      onClose={onClose}
      onFocus={onFocus}
      onMinimize={onMinimize}
      onMaximize={onMaximize}
      onRestore={onRestore}
      onMove={onMove}
      onResize={onResize}
    >
      <div style={{
        height: '100%',
        backgroundColor: '#c0c0c0',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'MS Sans Serif, sans-serif',
        fontSize: '12px'
      }}>
        {/* Toolbar */}
        <div style={{
          padding: '6px',
          backgroundColor: '#c0c0c0',
          borderBottom: '1px solid #808080',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              border: '2px outset #c0c0c0',
              backgroundColor: '#c0c0c0',
              cursor: isLoading ? 'default' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
          
          <span style={{ color: '#808080', fontSize: '11px' }}>
            {statuses.length} local posts
          </span>
        </div>

        {/* Content area */}
        <div 
          data-window-type="Local Timeline"
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px',
            backgroundColor: '#ffffff'
          }}>
          {error && (
            <div style={{ 
              color: '#800000', 
              padding: '10px',
              border: '2px inset #c0c0c0',
              backgroundColor: '#ffffff',
              marginBottom: '10px'
            }}>
              Error: {error}
              <div style={{ marginTop: '8px' }}>
                <button 
                  onClick={handleRefresh}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    border: '2px outset #c0c0c0',
                    backgroundColor: '#c0c0c0',
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {statuses.length === 0 && !isLoading && !error && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#808080'
            }}>
              No local posts found
            </div>
          )}

          {statuses.map((status) => (
            <PostComponent key={status.id} status={status} onImageClick={onImageClick} onVideoClick={onVideoClick} onAudioClick={onAudioClick} onYouTubeClick={onYouTubeClick} onConversationClick={onConversationClick} onUserClick={onUserClick} onReplyClick={onReplyClick} onEmojiPickerClick={onEmojiPickerClick} onFavoriteClick={handleFavoriteClick} onReblogClick={handleReblogClick} onEmojiReactClick={handleEmojiReactClick} onBookmarkClick={handleBookmarkClick} onRawPostClick={onRawPostClick} />
          ))}

          {/* Load more button */}
          {hasMore && statuses.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button 
                onClick={handleLoadMore}
                disabled={isLoading}
                style={{
                  padding: '6px 20px',
                  fontSize: '12px',
                  border: '2px outset #c0c0c0',
                  backgroundColor: '#c0c0c0',
                  cursor: isLoading ? 'default' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}

          {!hasMore && statuses.length > 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px',
              color: '#808080',
              fontSize: '11px'
            }}>
              End of local timeline
            </div>
          )}
        </div>
      </div>
    </DesktopWindow>
  );
};

export default LocalTimelineWindow;
