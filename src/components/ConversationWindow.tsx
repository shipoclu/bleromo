import React, { useEffect, useState, useRef, useCallback } from 'react';
import { DesktopWindow, type WindowMoveEvent, type WindowResizeEvent } from 'wtkrjs';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';
import PostComponent from './PostComponent';
import { updatePostEngagementCounts } from '../utils/postUpdates';
import { useAbortControllers } from '../utils/useAbortControllers';

interface Account {
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
}

interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'unknown';
  url: string;
  preview_url: string;
  description?: string;
}

interface EmojiReaction {
  name: string;
  count: number;
  me: boolean;
  url?: string;
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
  media_attachments: MediaAttachment[];
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

interface ConversationContext {
  ancestors: Status[];
  descendants: Status[];
}

interface ConversationWindowProps {
  id: string;
  statusId: string;
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
  onMove: (event: WindowMoveEvent) => void;
  onResize: (event: WindowResizeEvent) => void;
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

const ConversationWindow: React.FC<ConversationWindowProps> = ({
  id,
  statusId,
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
  const { createController, releaseController, isMountedRef } = useAbortControllers();
  const [conversation, setConversation] = useState<ConversationContext | null>(null);
  const [originalStatus, setOriginalStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchConversation = async () => {
    if (!snap.accessToken || !snap.serverUrl) return;

    const controller = createController();
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      // Fetch the original status and its context
      const [statusResponse, contextResponse] = await Promise.all([
        fetch(`${snap.serverUrl}/api/v1/statuses/${statusId}`, {
          headers: {
            'Authorization': `Bearer ${snap.accessToken}`
          },
          signal: controller.signal
        }),
        fetch(`${snap.serverUrl}/api/v1/statuses/${statusId}/context`, {
          headers: {
            'Authorization': `Bearer ${snap.accessToken}`
          },
          signal: controller.signal
        })
      ]);

      if (!statusResponse.ok) {
        throw new Error(`Failed to fetch status: ${statusResponse.status}`);
      }
      if (!contextResponse.ok) {
        throw new Error(`Failed to fetch conversation context: ${contextResponse.status}`);
      }

      const status: Status = await statusResponse.json();
      const context: ConversationContext = await contextResponse.json();

      if (!isMountedRef.current || controller.signal.aborted) return;
      setOriginalStatus(status);
      setConversation(context);

      // Update engagement counts for all posts in conversation
      const allPosts = [status, ...context.ancestors, ...context.descendants];
      setTimeout(() => {
        if (!isMountedRef.current) return;
        updatePostEngagementCounts(allPosts, 'Conversation');
      }, 100);

    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Error fetching conversation:', err);
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
    fetchConversation();
  };

  useEffect(() => {
    fetchConversation();
  }, [statusId]);

  const scrollToHighlightedPost = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const highlighted = container.querySelector('[data-highlighted-post="true"]') as HTMLElement | null;
    if (!highlighted) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = highlighted.getBoundingClientRect();
    const isVisible = targetRect.top >= containerRect.top && targetRect.bottom <= containerRect.bottom;
    if (isVisible) return;
    highlighted.scrollIntoView({ block: 'center' });
  }, []);

  useEffect(() => {
    if (!conversation || !originalStatus) return;
    const frame = requestAnimationFrame(scrollToHighlightedPost);
    return () => cancelAnimationFrame(frame);
  }, [conversation, originalStatus?.id, scrollToHighlightedPost]);

  const getAllPosts = (): Status[] => {
    if (!conversation || !originalStatus) return [];
    
    return [
      ...conversation.ancestors,
      originalStatus,
      ...conversation.descendants
    ];
  };

  const isOriginalPost = (status: Status): boolean => {
    return originalStatus ? status.id === originalStatus.id : false;
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

  return (
    <DesktopWindow
      id={id}
      title={`Conversation`}
      initialPosition={{ x: 160, y: 110 }}
      initialSize={{ width: 600, height: 700 }}
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
        fontFamily: 'var(--win98-font)',
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
            {getAllPosts().length} posts in conversation
          </span>
        </div>

        {/* Content area */}
        <div 
          ref={scrollContainerRef}
          data-window-type="Conversation"
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

          {getAllPosts().length === 0 && !isLoading && !error && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#808080'
            }}>
              No conversation found
            </div>
          )}

          {getAllPosts().map((status, index) => (
            <div
              key={status.id}
              data-highlighted-post={isOriginalPost(status) ? 'true' : undefined}
              style={{ position: 'relative' }}
            >
              {/* Highlight the original post */}
              {isOriginalPost(status) && (
                <div style={{
                  position: 'absolute',
                  left: '-4px',
                  top: '0',
                  bottom: '0',
                  width: '4px',
                  backgroundColor: '#0000ff',
                  zIndex: 1
                }} />
              )}
              
              <div style={{
                backgroundColor: isOriginalPost(status) ? '#f0f8ff' : 'transparent',
                border: isOriginalPost(status) ? '1px solid #0000ff' : 'none',
                borderRadius: isOriginalPost(status) ? '2px' : '0',
                padding: isOriginalPost(status) ? '4px' : '0'
              }}>
                <PostComponent 
                  status={status} 
                  onImageClick={onImageClick} 
                  onVideoClick={onVideoClick}
                  onAudioClick={onAudioClick}
                  onYouTubeClick={onYouTubeClick}
                  onConversationClick={onConversationClick}
                  onUserClick={onUserClick}
                  onReplyClick={onReplyClick}
                  onEmojiPickerClick={onEmojiPickerClick}
                  onFavoriteClick={handleFavoriteClick}
                  onReblogClick={handleReblogClick}
                  onEmojiReactClick={handleEmojiReactClick}
                />
              </div>
              
              {/* Thread line connector */}
              {index < getAllPosts().length - 1 && (
                <div style={{
                  marginLeft: '20px',
                  height: '8px',
                  borderLeft: '2px solid #e0e0e0'
                }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </DesktopWindow>
  );
};

export default ConversationWindow;
