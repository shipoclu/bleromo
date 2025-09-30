import React, { useEffect, useState } from 'react';
import { DesktopWindow } from 'wtkrjs';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';
import PostComponent from './PostComponent';
import { updatePostEngagementCounts } from '../utils/postUpdates';

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
  reblog?: Status;
  url: string;
}

interface PublicTimelineWindowProps {
  id: string;
  onImageClick?: (imageUrl: string, description?: string) => void;
  onVideoClick?: (videoUrl: string, description?: string) => void;
  onAudioClick?: (audioUrl: string, description?: string) => void;
  onYouTubeClick?: (videoId: string, videoUrl: string) => void;
  onConversationClick?: (statusId: string) => void;
  onUserClick?: (userId: string) => void;
  onReplyClick?: (statusId: string, mentionHandles: string[]) => void;
  onEmojiPickerClick?: (statusId: string) => void;
  onClose: () => void;
  onFocus: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onMove: () => void;
  onResize: () => void;
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

const PublicTimelineWindow: React.FC<PublicTimelineWindowProps> = ({
  id,
  onImageClick,
  onVideoClick,
  onAudioClick,
  onYouTubeClick,
  onConversationClick,
  onUserClick,
  onReplyClick,
  onEmojiPickerClick,
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
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxId, setMaxId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchTimeline = async (loadMore = false) => {
    if (!snap.accessToken || !snap.serverUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '20'
      });
      
      if (loadMore && maxId) {
        params.append('max_id', maxId);
      }

      const response = await fetch(`${snap.serverUrl}/api/v1/timelines/public?${params}`, {
        headers: {
          'Authorization': `Bearer ${snap.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch timeline: ${response.status}`);
      }

      const newStatuses: Status[] = await response.json();
      
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
        updatePostEngagementCounts(newStatuses, 'Public Timeline');
      }, 100);

    } catch (err) {
      console.error('Error fetching timeline:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    fetchTimeline();
  }, []);

  return (
    <DesktopWindow
      id={id}
      title="Public Timeline"
      initialPosition={{ x: 100, y: 50 }}
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
            {statuses.length} posts
          </span>
        </div>

        {/* Content area */}
        <div 
          data-window-type="Public Timeline"
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
              No posts found
            </div>
          )}

          {statuses.map((status) => (
            <PostComponent key={status.id} status={status} onImageClick={onImageClick} onVideoClick={onVideoClick} onAudioClick={onAudioClick} onYouTubeClick={onYouTubeClick} onConversationClick={onConversationClick} onUserClick={onUserClick} onReplyClick={onReplyClick} onEmojiPickerClick={onEmojiPickerClick} />
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
              End of timeline
            </div>
          )}
        </div>
      </div>
    </DesktopWindow>
  );
};

export default PublicTimelineWindow;