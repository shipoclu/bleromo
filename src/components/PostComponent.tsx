import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { updatePostEngagementCounts } from '../utils/postUpdates';

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
  onConversationClick?: (statusId: string) => void;
  onUserClick?: (userId: string) => void;
  onReplyClick?: (statusId: string, mentionHandles: string[]) => void;
  onFavoriteClick?: (statusId: string, currentlyFavorited: boolean) => Promise<{ favourited: boolean; favourites_count: number }>;
  onReblogClick?: (statusId: string, currentlyReblogged: boolean) => Promise<{ reblogged: boolean; reblogs_count: number }>;
  onEmojiReactClick?: (statusId: string, emojiName: string, currentlyReacted: boolean) => Promise<EmojiReaction[]>;
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

const PostComponent: React.FC<PostComponentProps> = ({ status, onImageClick, onVideoClick, onConversationClick, onUserClick, onReplyClick, onFavoriteClick, onReblogClick, onEmojiReactClick }) => {
  const [localStatus, setLocalStatus] = useState(status);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isReblogging, setIsReblogging] = useState(false);
  const [showSensitiveMedia, setShowSensitiveMedia] = useState(false);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);

  // Update local status when prop changes
  useEffect(() => {
    setLocalStatus(status);
  }, [status]);
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const stripHtml = useCallback((html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }, []);

  const processCustomEmojiToElements = useCallback((content: string, emojis?: CustomEmoji[]): React.ReactNode[] => {
    if (!emojis || emojis.length === 0) {
      return [stripHtml(content)];
    }

    let processedContent = stripHtml(content);
    const parts: React.ReactNode[] = [];
    
    // Create a map of all emoji patterns and their positions
    const emojiMatches: Array<{ index: number; length: number; emoji: CustomEmoji; matchIndex: number }> = [];
    
    emojis.forEach((emoji, emojiIndex) => {
      const emojiPattern = new RegExp(`:${emoji.shortcode}:`, 'g');
      let match;
      
      while ((match = emojiPattern.exec(processedContent)) !== null) {
        emojiMatches.push({
          index: match.index,
          length: match[0].length,
          emoji: emoji,
          matchIndex: emojiIndex * 1000 + match.index // unique key
        });
      }
    });
    
    // Sort matches by position
    emojiMatches.sort((a, b) => a.index - b.index);
    
    let lastIndex = 0;
    emojiMatches.forEach((match) => {
      // Add text before emoji
      if (match.index > lastIndex) {
        const textPart = processedContent.slice(lastIndex, match.index);
        if (textPart) {
          parts.push(textPart);
        }
      }
      
      // Add emoji as React element
      parts.push(
        <img 
          key={`emoji-${match.matchIndex}`}
          src={match.emoji.url} 
          alt={`:${match.emoji.shortcode}:`}
          style={{
            height: '1.2em',
            width: 'auto',
            verticalAlign: 'middle',
            display: 'inline',
            opacity: 1,
            visibility: 'visible',
            transform: 'none'
          }}
        />
      );
      
      lastIndex = match.index + match.length;
    });
    
    // Add remaining text
    if (lastIndex < processedContent.length) {
      const remainingText = processedContent.slice(lastIndex);
      if (remainingText) {
        parts.push(remainingText);
      }
    }
    
    return parts.length > 0 ? parts : [processedContent];
  }, [stripHtml]);

  // Memoize processed content to avoid re-processing during re-renders
  const processedDisplayName = useMemo(() => {
    return processCustomEmojiToElements(localStatus.account.display_name || localStatus.account.username, localStatus.account.emojis);
  }, [localStatus.account.display_name, localStatus.account.username, localStatus.account.emojis, processCustomEmojiToElements]);

  const processedContent = useMemo(() => {
    return processCustomEmojiToElements(localStatus.content, localStatus.emojis);
  }, [localStatus.content, localStatus.emojis, processCustomEmojiToElements]);

  const processedReblogDisplayName = useMemo(() => {
    if (localStatus.reblog) {
      return processCustomEmojiToElements(localStatus.account.display_name || localStatus.account.username, localStatus.account.emojis);
    }
    return [];
  }, [localStatus.reblog, localStatus.account.display_name, localStatus.account.username, localStatus.account.emojis, processCustomEmojiToElements]);

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

  // If this is a boost/reblog, show the boost info and the original post
  if (status.reblog) {
    return (
      <div 
        data-post-id={localStatus.id}
        style={{
          padding: '8px',
          border: '1px solid #808080',
          backgroundColor: '#ffffff',
          marginBottom: '8px',
          fontFamily: 'MS Sans Serif, sans-serif',
          fontSize: '12px',
          overflow: 'hidden',
          wordWrap: 'break-word'
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
              textDecoration: onUserClick ? 'underline' : 'none'
            }}
            onClick={() => onUserClick && onUserClick(status.account.id)}
          >
            {processedReblogDisplayName}
          </strong> 
          <span style={{ flexShrink: 0 }}>boosted</span>
        </div>
        
        {/* Original post */}
        <PostComponent status={status.reblog} onImageClick={onImageClick} onVideoClick={onVideoClick} onConversationClick={onConversationClick} onUserClick={onUserClick} onReplyClick={onReplyClick} onFavoriteClick={onFavoriteClick} onReblogClick={onReblogClick} onEmojiReactClick={onEmojiReactClick} />
      </div>
    );
  }

  // Regular post
  return (
    <div 
      data-post-id={localStatus.id}
      style={{
        padding: '8px',
        border: '1px solid #808080',
        backgroundColor: '#ffffff',
        marginBottom: '8px',
        fontFamily: 'MS Sans Serif, sans-serif',
        fontSize: '12px',
        overflow: 'hidden',
        wordWrap: 'break-word'
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
                textDecoration: onUserClick ? 'underline' : 'none'
              }}
              onClick={() => onUserClick && onUserClick(localStatus.account.id)}
            >
              {processedDisplayName}
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
        {processedContent}
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
                  justifyContent: 'center'
                }}>
                  <audio src={media.url} controls style={{ width: '100%' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Interaction stats */}
      <div style={{
        display: 'flex',
        gap: '16px',
        fontSize: '11px',
        color: '#808080',
        borderTop: '1px solid #e0e0e0',
        paddingTop: '6px'
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
            color: localStatus.reblogged ? '#ff0000' : '#808080',
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
            color: localStatus.favourited ? '#ff0000' : '#808080',
            cursor: onFavoriteClick ? 'pointer' : 'default',
            opacity: isFavoriting ? 0.5 : 1
          }}
          onClick={handleFavoriteClick}
        >
          ⭐ {formatNumber(localStatus.favourites_count)}
        </span>
        
        {/* Emoji Reactions */}
        {(() => {
          const reactions = getEmojiReactions(localStatus);
          console.log(`🎨 Rendering emoji reactions for status ${localStatus.id}:`, reactions);
          return reactions.length > 0;
        })() && (
          <>
            {getEmojiReactions(localStatus).map((reaction) => {
              const opacity = reactingEmoji === reaction.name ? 0.5 : 1;
              console.log(`🎨 Rendering reaction:`, {
                name: reaction.name,
                url: reaction.url,
                count: reaction.count,
                me: reaction.me,
                reactingEmoji: reactingEmoji,
                opacity: opacity
              });
              return (
                <span
                  key={reaction.name}
                  data-emoji-reaction={reaction.name}
                  style={{
                    cursor: onEmojiReactClick ? 'pointer' : 'default',
                    color: reaction.me ? '#ff0000' : '#808080',
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
  );
};

export default React.memo(PostComponent);