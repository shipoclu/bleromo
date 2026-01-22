import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DesktopMenu, type Position } from 'wtkrjs';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';
import { updatePostEngagementCounts } from '../utils/postUpdates';
import ParsedContent from './ParsedContent';

interface Account {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  url: string;
  emojis?: CustomEmoji[];
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
  url?: string; // For custom emoji
}

interface CustomEmoji {
  shortcode: string;
  url: string;
  static_url?: string;
  visible_in_picker?: boolean;
}

interface Status {
  id: string;
  created_at: string;
  account: Account;
  content: string;
  visibility: 'public' | 'unlisted' | 'private' | 'direct';
  spoiler_text: string;
  sensitive: boolean;
  media_attachments: MediaAttachment[];
  emojis?: CustomEmoji[];
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
  pleroma?: {
    emoji_reactions?: EmojiReaction[];
    [key: string]: any;
  };
}

interface PostComponentProps {
  status: Status;
  onImageClick?: (imageUrl: string, description?: string) => void;
  onVideoClick?: (videoUrl: string, description?: string) => void;
  onAudioClick?: (audioUrl: string, description?: string) => void;
  onYouTubeClick?: (videoId: string, videoUrl: string) => void;
  onConversationClick?: (statusId: string) => void;
  onUserClick?: (userId: string) => void;
  onReplyClick?: (statusId: string, mentionHandles: string[]) => void;
  onFavoriteClick?: (statusId: string, currentlyFavorited: boolean) => Promise<{ favourited: boolean; favourites_count: number }>;
  onReblogClick?: (statusId: string, currentlyReblogged: boolean) => Promise<{ reblogged: boolean; reblogs_count: number }>;
  onEmojiReactClick?: (statusId: string, emojiName: string, currentlyReacted: boolean) => Promise<EmojiReaction[]>;
  onEmojiPickerClick?: (statusId: string) => void;
  onBookmarkClick?: (statusId: string, currentlyBookmarked: boolean) => Promise<{ bookmarked: boolean }>;
  onRawPostClick?: (statusId: string, jsonData: any) => void;
}

const SensitiveMediaOverlay: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 1,
        backgroundColor: '#ffffff'
      }}
      onClick={onClick}
    >
      <img
        src="/silverlight.png"
        alt="Sensitive media"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

const VideoThumbnail: React.FC<{ videoUrl: string; onVideoClick: () => void }> = ({ videoUrl, onVideoClick }) => {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '1',
        position: 'relative',
        cursor: 'pointer',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #808080',
        overflow: 'hidden'
      }}
      onClick={onVideoClick}
    >
      <video
        src={videoUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        muted
        preload="metadata"
        loop
      />
      
      {/* Play button overlay */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '20px',
        position: 'absolute',
        zIndex: 1
      }}>
        ▶
      </div>
    </div>
  );
};

const PostComponent: React.FC<PostComponentProps> = ({ status, onImageClick, onVideoClick, onAudioClick, onYouTubeClick, onConversationClick, onUserClick, onReplyClick, onFavoriteClick, onReblogClick, onEmojiReactClick, onEmojiPickerClick, onBookmarkClick, onRawPostClick }) => {
  const snap = useSnapshot(appState);
  const [localStatus, setLocalStatus] = useState(() => ({
    ...status,
    bookmarked: status.bookmarked ?? false
  }));
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isReblogging, setIsReblogging] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [showSensitiveMedia, setShowSensitiveMedia] = useState(false);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<Position>({ x: 0, y: 0 });
  const postRef = useRef<HTMLDivElement | null>(null);

  // Update local status when prop changes
  useEffect(() => {
    setLocalStatus({
      ...status,
      bookmarked: status.bookmarked ?? false
    });
  }, [status]);

  // Listen for emoji reaction updates from the engagement count system
  useEffect(() => {
    const handleEmojiUpdate = (event: CustomEvent) => {
      const { statusId, reactions } = event.detail;
      if (statusId === localStatus.id) {
        console.log('🎨 Received emoji update event for status:', statusId, reactions);
        setLocalStatus(prev => ({
          ...prev,
          emoji_reactions: reactions,
          pleroma: {
            ...prev.pleroma,
            emoji_reactions: reactions
          }
        }));
      }
    };

    const postElement = postRef.current;
    if (postElement) {
      postElement.addEventListener('emojiReactionsUpdate', handleEmojiUpdate as EventListener);
      return () => {
        postElement.removeEventListener('emojiReactionsUpdate', handleEmojiUpdate as EventListener);
      };
    }
  }, [localStatus.id]);
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const htmlToPlainText = useCallback((html: string) => {
    if (!html) return '';
    const normalized = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n');
    const doc = new DOMParser().parseFromString(normalized, 'text/html');
    return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }, []);

  const displayName = localStatus.account.display_name || localStatus.account.username;

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

  const extractMentionHandles = (status: Status) => {
    const handles: string[] = [];
    
    // Add the original poster
    handles.push(status.account.acct || status.account.username);
    
    // Add all mentioned users from the API data
    status.mentions.forEach(mention => {
      const handle = mention.acct || mention.username;
      if (!handles.includes(handle)) {
        handles.push(handle);
      }
    });
    
    return handles;
  };

  const handleReplyClick = () => {
    if (onReplyClick) {
      const mentionHandles = extractMentionHandles(localStatus);
      onReplyClick(localStatus.id, mentionHandles);
    }
  };

  const handleFavoriteClick = async () => {
    if (!onFavoriteClick || isFavoriting) return;

    setIsFavoriting(true);
    try {
      const result = await onFavoriteClick(localStatus.id, localStatus.favourited);
      
      const updatedStatus = {
        ...localStatus,
        favourited: result.favourited,
        favourites_count: result.favourites_count
      };
      
      setLocalStatus(updatedStatus);
      
      // Update all instances of this post across windows
      updatePostEngagementCounts([updatedStatus], 'PostComponent');
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsFavoriting(false);
    }
  };

  const handleReblogClick = async () => {
    if (!onReblogClick || isReblogging) return;

    console.log('🔄 Reblog clicked for post:', localStatus.id, 'currently reblogged:', localStatus.reblogged);
    setIsReblogging(true);
    try {
      const result = await onReblogClick(localStatus.id, localStatus.reblogged);
      console.log('🔄 Reblog API result:', result);
      
      const updatedStatus = {
        ...localStatus,
        reblogged: result.reblogged,
        reblogs_count: result.reblogs_count
      };
      
      setLocalStatus(updatedStatus);
      
      // Update all instances of this post across windows
      updatePostEngagementCounts([updatedStatus], 'PostComponent');
    } catch (error) {
      console.error('Error toggling reblog:', error);
    } finally {
      setIsReblogging(false);
    }
  };

  const handleEmojiReactClick = async (emojiName: string) => {
    if (!onEmojiReactClick || reactingEmoji === emojiName) return;

    const currentReactions = getEmojiReactions(localStatus);
    const currentReaction = currentReactions.find(r => r.name === emojiName);
    console.log(`🎭 Before reaction - Current reactions:`, currentReactions);
    console.log(`🎭 Clicking on emoji:`, emojiName, `Currently reacted:`, currentReaction?.me || false);
    
    setReactingEmoji(emojiName);
    
    try {
      const updatedReactions = await onEmojiReactClick(localStatus.id, emojiName, currentReaction?.me || false);
      console.log(`🎭 API returned reactions:`, updatedReactions);
      
      // Update the status with emoji reactions in the correct location
      const updatedStatus = {
        ...localStatus,
        // Update both fields to ensure compatibility
        emoji_reactions: updatedReactions,
        pleroma: {
          ...localStatus.pleroma,
          emoji_reactions: updatedReactions
        }
      };
      
      console.log(`🎭 Updated status reactions:`, getEmojiReactions(updatedStatus));
      setLocalStatus(updatedStatus);
      
      // Don't call updatePostEngagementCounts for emoji reactions since it breaks the DOM
      // React will handle the emoji reaction updates for this component
      console.log(`🎭 Skipping cross-window update for emoji reactions to prevent DOM corruption`);
    } catch (error) {
      console.error('Error toggling emoji reaction:', error);
    } finally {
      console.log(`🎭 Clearing reactingEmoji state`);
      setReactingEmoji(null);
    }
  };


  const handlePostActionsButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    // Position menu below the button using global coordinates for portal
    const globalX = rect.left;
    const globalY = rect.bottom + 2;
    
    setContextMenuPosition({ x: globalX, y: globalY });
    setContextMenuOpen(true);
  };

  const handleMenuClose = () => {
    setContextMenuOpen(false);
  };

  const handleCopyRichContent = async () => {
    const htmlContent = localStatus.content || '';
    const plainText = htmlToPlainText(htmlContent);
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plainText || htmlContent);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = plainText || htmlContent;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch (error) {
      console.error('📋 Error copying post content:', error);
    } finally {
      setContextMenuOpen(false);
    }
  };

  // Create context menu items
  const contextMenuItems = [
    {
      type: 'item' as const,
      text: localStatus.bookmarked ? 'Unbookmark' : 'Bookmark',
      onClick: async () => {
        console.log('🔖 Bookmark menu item clicked!');
        console.log('🔖 onBookmarkClick function:', onBookmarkClick);
        console.log('🔖 isBookmarking:', isBookmarking);
        console.log('🔖 localStatus.bookmarked:', localStatus.bookmarked);
        console.log('🔖 localStatus.id:', localStatus.id);
        
        if (!onBookmarkClick || isBookmarking) {
          console.log('🔖 Bookmark action blocked - no function or already processing');
          return;
        }
        
        setIsBookmarking(true);
        console.log('🔖 Starting bookmark API call...');
        
        try {
          const result = await onBookmarkClick(localStatus.id, localStatus.bookmarked ?? false);
          console.log('🔖 Bookmark API result:', result);
          
          const updatedStatus = {
            ...localStatus,
            bookmarked: result.bookmarked
          };
          
          setLocalStatus(updatedStatus);
          console.log('🔖 Updated local status:', updatedStatus);
          
          // Update all instances of this post across windows
          updatePostEngagementCounts([updatedStatus], 'PostComponent');
        } catch (error) {
          console.error('🔖 Error toggling bookmark:', error);
        } finally {
          setIsBookmarking(false);
          console.log('🔖 Bookmark processing complete');
        }
        
        // Close menu after action
        setContextMenuOpen(false);
        console.log('🔖 Menu closed');
      },
      disabled: isBookmarking
    },
    {
      type: 'item' as const,
      text: 'Copy',
      onClick: handleCopyRichContent,
      disabled: false
    },
    {
      type: 'item' as const,
      text: 'Raw',
      onClick: async () => {
        if (!snap.accessToken || !snap.serverUrl) {
          console.error('❌ Not authenticated');
          return;
        }

        if (!onRawPostClick) {
          console.error('❌ No raw post click handler provided');
          return;
        }

        try {
          console.log('📄 Fetching raw post data for:', localStatus.id);
          const response = await fetch(`${snap.serverUrl}/api/v1/statuses/${localStatus.id}`, {
            headers: {
              'Authorization': `Bearer ${snap.accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch post data: ${response.status}`);
          }

          const jsonData = await response.json();
          console.log('📄 Raw post data fetched:', jsonData);
          
          onRawPostClick(localStatus.id, jsonData);
        } catch (error) {
          console.error('📄 Error fetching raw post data:', error);
        }
        
        // Close menu after action
        setContextMenuOpen(false);
      },
      disabled: false
    }
  ];

  // If this is a boost/reblog, show the boost info and the original post
  if (status.reblog) {
    return (
      <div
        ref={postRef}
        data-post-id={localStatus.id}
        style={{
          padding: '8px',
          border: '1px solid #808080',
          backgroundColor: '#ffffff',
          marginBottom: '8px',
          fontFamily: 'MS Sans Serif, sans-serif',
          fontSize: '12px',
          overflow: 'hidden',
          wordWrap: 'break-word',
          position: 'relative'
        }}>
        {/* Boost header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '6px',
          color: '#008000',
          fontSize: '11px',
          overflow: 'hidden'
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M1 8l4-4v3h5.5a2.5 2.5 0 010 5H9v-2h1.5a.5.5 0 000-1H5v3l-4-4zM15 8l-4 4V9H5.5a2.5 2.5 0 010-5H7v2H5.5a.5.5 0 000 1H11V4l4 4z"/>
          </svg>
          <strong 
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flexShrink: 1,
              minWidth: 0,
              cursor: onUserClick ? 'pointer' : 'default',
              textDecoration: onUserClick ? 'underline' : 'none',
              color: onUserClick ? 'var(--win98-help-green)' : 'inherit'
            }}
            onClick={() => onUserClick && onUserClick(status.account.id)}
          >
            <ParsedContent html={displayName} emojis={localStatus.account.emojis} />
          </strong> 
          <span style={{ flexShrink: 0 }}>boosted</span>
        </div>
        
        {/* Original post */}
        <PostComponent status={status.reblog} onImageClick={onImageClick} onVideoClick={onVideoClick} onAudioClick={onAudioClick} onYouTubeClick={onYouTubeClick} onConversationClick={onConversationClick} onUserClick={onUserClick} onReplyClick={onReplyClick} onEmojiPickerClick={onEmojiPickerClick} onFavoriteClick={onFavoriteClick} onReblogClick={onReblogClick} onEmojiReactClick={onEmojiReactClick} onBookmarkClick={onBookmarkClick} onRawPostClick={onRawPostClick} />
      </div>
    );
  }

  // Regular post
  return (
    <>
      <div
        ref={postRef}
        data-post-id={localStatus.id}
        style={{
          padding: '8px',
          border: '1px solid #808080',
          backgroundColor: '#ffffff',
          marginBottom: '8px',
          fontFamily: 'MS Sans Serif, sans-serif',
          fontSize: '12px',
          overflow: 'hidden',
          wordWrap: 'break-word',
          position: 'relative'
        }}>
      {/* Header with avatar and user info */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '8px'
      }}>
        <img 
          src={localStatus.account.avatar} 
          alt="Avatar"
          style={{
            width: '32px',
            height: '32px',
            border: '1px solid #808080'
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            marginBottom: '2px',
            overflow: 'hidden'
          }}>
            <strong 
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flexShrink: 1,
                minWidth: 0,
                cursor: onUserClick ? 'pointer' : 'default',
                textDecoration: onUserClick ? 'underline' : 'none',
                color: onUserClick ? 'var(--win98-help-green)' : 'inherit'
              }}
            onClick={() => onUserClick && onUserClick(localStatus.account.id)}
          >
              <ParsedContent html={displayName} emojis={localStatus.account.emojis} />
            </strong>
            <span style={{ 
              color: '#808080',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flexShrink: 1,
              minWidth: 0
            }}>
              @{localStatus.account.acct}
            </span>
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#808080' 
          }}>
            {formatDate(localStatus.created_at)}
          </div>
        </div>
      </div>

      {/* Spoiler warning if present */}
      {localStatus.spoiler_text && (
        <div style={{
          padding: '4px 8px',
          backgroundColor: '#ffffe0',
          border: '1px solid #ffcc00',
          marginBottom: '8px',
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          Content Warning: {localStatus.spoiler_text}
        </div>
      )}

      {/* Post content */}
      <div 
        style={{
          marginBottom: '8px',
          lineHeight: '1.4'
        }}
      >
        <ParsedContent
          html={localStatus.content}
          mentions={localStatus.mentions}
          emojis={localStatus.emojis}
          onUserClick={onUserClick}
          onYouTubeClick={onYouTubeClick}
        />
      </div>

      {/* Media attachments */}
      {localStatus.media_attachments.length > 0 && (
        <div style={{
          marginBottom: '8px',
          display: 'grid',
          gridTemplateColumns: localStatus.media_attachments.length === 1 ? '1fr' : 'repeat(2, 1fr)',
          gap: '4px'
        }}>
          {localStatus.media_attachments.map((media) => (
            <div key={media.id} style={{ 
              border: '1px solid #808080',
              position: 'relative'
            }}>
              {media.type === 'image' && (
                <>
                  <img 
                    src={media.preview_url || media.url}
                    alt={media.description || 'Media attachment'}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      objectFit: 'contain',
                      display: 'block',
                      cursor: 'pointer',
                      backgroundColor: '#f0f0f0'
                    }}
                    onClick={() => onImageClick && onImageClick(media.url, media.description)}
                  />
                  {localStatus.sensitive && !showSensitiveMedia && (
                    <SensitiveMediaOverlay onClick={() => setShowSensitiveMedia(true)} />
                  )}
                </>
              )}
              {media.type === 'video' && (
                <div style={{ position: 'relative' }}>
                  <VideoThumbnail
                    videoUrl={media.url}
                    onVideoClick={() => onVideoClick && onVideoClick(media.url, media.description)}
                  />
                  {localStatus.sensitive && !showSensitiveMedia && (
                    <SensitiveMediaOverlay onClick={() => setShowSensitiveMedia(true)} />
                  )}
                </div>
              )}
              {media.type === 'audio' && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  backgroundColor: '#f0f0f0',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => onAudioClick && onAudioClick(media.url, media.description)}
                >
                  <img 
                    src="/volume_sheet-0.png" 
                    alt="Audio attachment" 
                    style={{
                      width: '48px',
                      height: '48px',
                      opacity: 0.7
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Interaction stats */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '11px',
        color: '#808080',
        borderTop: '1px solid #e0e0e0',
        paddingTop: '6px',
        overflow: 'visible'
      }}>
        <span 
          data-replies-count
          style={{ 
            cursor: onReplyClick ? 'pointer' : 'default'
          }}
          onClick={handleReplyClick}
        >
          ↩️ {formatNumber(localStatus.replies_count)}
        </span>
        <span 
          data-reblogs-count
          style={{ 
            color: localStatus.reblogged ? 'var(--win98-help-green)' : '#808080',
            fontWeight: localStatus.reblogged ? 'bold' : 'normal',
            cursor: onReblogClick ? 'pointer' : 'default',
            opacity: isReblogging ? 0.5 : 1
          }}
          onClick={handleReblogClick}
        >
          🔄 {formatNumber(localStatus.reblogs_count)}
        </span>
        <span 
          data-favourites-count
          style={{ 
            color: localStatus.favourited ? 'var(--win98-help-green)' : '#808080',
            fontWeight: localStatus.favourited ? 'bold' : 'normal',
            cursor: onFavoriteClick ? 'pointer' : 'default',
            opacity: isFavoriting ? 0.5 : 1
          }}
          onClick={handleFavoriteClick}
        >
          ⭐ {formatNumber(localStatus.favourites_count)}
        </span>

        {/* Button Group */}
        <div style={{ 
          display: 'inline-flex', 
          marginLeft: '8px',
          gap: '2px',
          position: 'relative'
        }}>
          {/* Post Actions Button */}
          <button
            onClick={handlePostActionsButtonClick}
            title="Post Actions"
            style={{
              margin: '0',
              padding: '2px 4px',
              fontSize: '10px',
              border: '2px outset #c0c0c0',
              backgroundColor: '#c0c0c0',
              cursor: 'pointer',
              fontFamily: 'MS Sans Serif, sans-serif',
              minWidth: 'auto',
              width: 'auto',
              lineHeight: '1',
              verticalAlign: 'middle',
              filter: 'none',
              color: 'inherit'
            }}
            onMouseDown={(e) => e.currentTarget.style.border = '2px inset #c0c0c0'}
            onMouseUp={(e) => e.currentTarget.style.border = '2px outset #c0c0c0'}
            onMouseLeave={(e) => e.currentTarget.style.border = '2px outset #c0c0c0'}
          >
            📑
          </button>
          
          {/* Emoji React Picker Button */}
          {onEmojiPickerClick && (
            <button
              onClick={() => onEmojiPickerClick(localStatus.id)}
              title="Add emoji reaction"
              style={{
                margin: '0',
                padding: '2px 4px',
                fontSize: '10px',
                border: '2px outset #c0c0c0',
                backgroundColor: '#c0c0c0',
                cursor: 'pointer',
                fontFamily: 'MS Sans Serif, sans-serif',
                minWidth: 'auto',
                width: 'auto',
                lineHeight: '1',
                verticalAlign: 'middle'
              }}
              onMouseDown={(e) => e.currentTarget.style.border = '2px inset #c0c0c0'}
              onMouseUp={(e) => e.currentTarget.style.border = '2px outset #c0c0c0'}
              onMouseLeave={(e) => e.currentTarget.style.border = '2px outset #c0c0c0'}
            >
              ⁂
            </button>
          )}
        </div>
        
        {/* Emoji Reactions */}
        {(() => {
          const reactions = getEmojiReactions(localStatus);
          return reactions.length > 0;
        })() && (
          <>
            {getEmojiReactions(localStatus).map((reaction) => {
              const opacity = reactingEmoji === reaction.name ? 0.5 : 1;
              return (
                <span
                  key={reaction.name}
                  data-emoji-reaction={reaction.name}
                  style={{
                    cursor: onEmojiReactClick ? 'pointer' : 'default',
                    color: reaction.me ? 'var(--win98-help-green)' : '#808080',
                    fontWeight: reaction.me ? 'bold' : 'normal',
                    opacity: opacity,
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                  onClick={() => handleEmojiReactClick(reaction.name)}
                >
                  {reaction.url ? (
                    <img
                      src={reaction.url}
                      alt={reaction.name}
                      style={{
                        width: '16px',
                        height: '16px',
                        verticalAlign: 'middle'
                      }}
                    />
                  ) : (
                    reaction.name
                  )}
                  {formatNumber(reaction.count)}
                </span>
              );
            })}
          </>
        )}
        
        <span 
          style={{ 
            marginLeft: 'auto',
            cursor: onConversationClick ? 'pointer' : 'default'
          }}
          onClick={() => onConversationClick && onConversationClick(localStatus.id)}
        >
          {localStatus.visibility === 'public' ? '🌐' : 
           localStatus.visibility === 'unlisted' ? '🔓' :
           localStatus.visibility === 'private' ? '🔒' : '✉️'}
        </span>
      </div>
      </div>
      
      {/* Portal for post actions menu */}
      {contextMenuOpen && createPortal(
        <DesktopMenu
          position={contextMenuPosition}
          items={contextMenuItems}
          onClose={handleMenuClose}
          zIndex={10000}
        />,
        document.body
      )}
    </>
  );
};

export default React.memo(PostComponent);
