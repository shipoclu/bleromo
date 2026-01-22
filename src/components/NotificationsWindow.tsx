import React, { useEffect, useState } from 'react';
import { DesktopWindow, type WindowMoveEvent, type WindowResizeEvent } from 'wtkrjs';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';
import NotificationComponent from './NotificationComponent';
import { updatePostEngagementCounts } from '../utils/postUpdates';

interface Account {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  url: string;
}

interface Status {
  id: string;
  created_at: string;
  account: Account;
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
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  reblogged: boolean;
  favourited: boolean;
  bookmarked?: boolean;
  reblog?: Status;
  url: string;
}

interface Notification {
  id: string;
  type: 'mention' | 'reblog' | 'favourite' | 'follow' | 'follow_request' | 'poll' | 'status' | 'pleroma:emoji_reaction';
  created_at: string;
  account: Account;
  status?: Status;
  emoji?: string;
}

interface NotificationsWindowProps {
  id: string;
  onImageClick?: (imageUrl: string, description?: string) => void;
  onVideoClick?: (videoUrl: string, description?: string) => void;
  onAudioClick?: (audioUrl: string, description?: string) => void;
  onYouTubeClick?: (videoId: string, videoUrl: string) => void;
  onConversationClick?: (statusId: string) => void;
  onUserClick?: (userId: string) => void;
  onReplyClick?: (statusId: string, mentionHandles: string[]) => void;
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

  const NotificationsWindow: React.FC<NotificationsWindowProps> = ({
    id,
    onImageClick,
    onVideoClick,
    onAudioClick,
    onYouTubeClick,
    onConversationClick,
    onUserClick,
    onReplyClick,
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxId, setMaxId] = useState<string | null>(null);
  const [sinceId, setSinceId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = async (loadMore = false, loadNewer = false) => {
    if (!snap.accessToken || !snap.serverUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '20'
      });
      
      if (loadMore && maxId) {
        params.append('max_id', maxId);
      } else if (loadNewer && sinceId) {
        params.append('since_id', sinceId);
      }

      const response = await fetch(`${snap.serverUrl}/api/v1/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${snap.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }

      const newNotifications: Notification[] = await response.json();

      if (loadNewer) {
        // Add to the beginning (newer notifications)
        setNotifications(prev => [...newNotifications, ...prev]);
        if (newNotifications.length > 0) {
          setSinceId(newNotifications[0].id);
        }
      } else if (loadMore) {
        // Add to the end (older notifications)
        setNotifications(prev => [...prev, ...newNotifications]);
      } else {
        // Replace all notifications (refresh)
        setNotifications(newNotifications);
        if (newNotifications.length > 0) {
          setSinceId(newNotifications[0].id);
        }
      }

      // Set up pagination
      if (newNotifications.length > 0) {
        if (!loadNewer) {
          setMaxId(newNotifications[newNotifications.length - 1].id);
        }
        setHasMore(newNotifications.length === 20); // Full page means there might be more
      } else {
        if (loadMore) {
          setHasMore(false);
        }
      }

      // Update engagement counts for any statuses in notifications
      const statusesFromNotifications = newNotifications
        .filter(notification => notification.status)
        .map(notification => notification.status!);
      
      if (statusesFromNotifications.length > 0) {
        setTimeout(() => {
          updatePostEngagementCounts(statusesFromNotifications, 'Notifications');
        }, 100);
      }

    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setSinceId(null);
    setMaxId(null);
    setHasMore(true);
    fetchNotifications(false, false);
  };

  const handleLoadNewer = () => {
    if (!isLoading && sinceId) {
      fetchNotifications(false, true);
    }
  };

  const handleLoadOlder = () => {
    if (!isLoading && hasMore) {
      fetchNotifications(true, false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <DesktopWindow
      id={id}
      title="Notifications"
      initialPosition={{ x: 140, y: 90 }}
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

          <button 
            onClick={handleLoadNewer}
            disabled={isLoading || !sinceId}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              border: '2px outset #c0c0c0',
              backgroundColor: '#c0c0c0',
              cursor: (isLoading || !sinceId) ? 'default' : 'pointer',
              opacity: (isLoading || !sinceId) ? 0.6 : 1
            }}
          >
            Load Newer
          </button>
          
          <span style={{ color: '#808080', fontSize: '11px' }}>
            {notifications.length} notifications
          </span>
        </div>

        {/* Content area */}
        <div 
          data-window-type="Notifications"
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

          {notifications.length === 0 && !isLoading && !error && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#808080'
            }}>
              No notifications found
            </div>
          )}

          {notifications.map((notification) => (
            <NotificationComponent 
              key={notification.id} 
              notification={notification} 
              onImageClick={onImageClick} 
              onVideoClick={onVideoClick}
              onAudioClick={onAudioClick}
              onYouTubeClick={onYouTubeClick}
              onConversationClick={onConversationClick}
              onUserClick={onUserClick}
              onReplyClick={onReplyClick}
            />
          ))}

          {/* Load older button */}
          {hasMore && notifications.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button 
                onClick={handleLoadOlder}
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
                {isLoading ? 'Loading...' : 'Load Older'}
              </button>
            </div>
          )}

          {!hasMore && notifications.length > 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px',
              color: '#808080',
              fontSize: '11px'
            }}>
              End of notifications
            </div>
          )}
        </div>
      </div>
    </DesktopWindow>
  );
};

export default NotificationsWindow;
