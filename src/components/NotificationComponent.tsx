import React, { useCallback } from 'react';
import FollowRequestItem from './FollowRequestItem';
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

interface CustomEmoji {
  shortcode: string;
  url: string;
  static_url?: string;
  visible_in_picker?: boolean;
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
  emojis?: CustomEmoji[];
  mentions: Array<{
    id: string;
    username: string;
    acct: string;
    url: string;
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
  emoji_reactions?: EmojiReaction[];
  pleroma?: {
    emoji_reactions?: EmojiReaction[];
    [key: string]: any;
  };
}

interface Notification {
  id: string;
  type: 'mention' | 'reblog' | 'favourite' | 'follow' | 'follow_request' | 'poll' | 'status' | 'pleroma:emoji_reaction';
  created_at: string;
  account: Account;
  status?: Status;
  emoji?: string;
  emoji_url?: string;
}

interface NotificationComponentProps {
  notification: Notification;
  onImageClick?: (imageUrl: string, description?: string) => void;
  onVideoClick?: (videoUrl: string, description?: string) => void;
  onAudioClick?: (audioUrl: string, description?: string) => void;
  onYouTubeClick?: (videoId: string, videoUrl: string) => void;
  onConversationClick?: (statusId: string) => void;
  onUserClick?: (userId: string) => void;
  onReplyClick?: (statusId: string, mentionHandles: string[]) => void;
  onFollowRequestApprove?: (accountId: string) => Promise<void>;
  onFollowRequestDeny?: (accountId: string) => Promise<void>;
}

const NotificationComponent: React.FC<NotificationComponentProps> = ({ 
  notification, 
  onImageClick, 
  onVideoClick,
  onAudioClick,
  onYouTubeClick,
  onConversationClick,
  onUserClick,
  onReplyClick,
  onFollowRequestApprove,
  onFollowRequestDeny
}) => {
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const displayName = notification.account.display_name || notification.account.username;

  const getNotificationIcon = (type: string, emoji?: string) => {
    switch (type) {
      case 'mention':
        return '💬';
      case 'reblog':
        return '🔄';
      case 'favourite':
        return '⭐';
      case 'follow':
        return '👤';
      case 'follow_request':
        return '👋';
      case 'poll':
        return '📊';
      case 'status':
        return '📝';
      case 'pleroma:emoji_reaction':
        return emoji || '👍';
      default:
        return '🔔';
    }
  };

  const normalizeEmojiName = (value?: string | null) => {
    if (!value) return '';
    return value.replace(/^:+|:+$/g, '');
  };

  const getReactionEmojiUrl = (notification: Notification) => {
    if (notification.emoji_url) return notification.emoji_url;
    const reactions = notification.status?.pleroma?.emoji_reactions
      || notification.status?.emoji_reactions
      || [];
    const target = normalizeEmojiName(notification.emoji);
    if (!target) return undefined;
    return reactions.find(reaction => normalizeEmojiName(reaction.name) === target)?.url;
  };

  const renderNotificationIcon = (notification: Notification) => {
    if (notification.type !== 'pleroma:emoji_reaction') {
      return getNotificationIcon(notification.type, notification.emoji);
    }
    const emojiUrl = getReactionEmojiUrl(notification);
    const emojiLabel = notification.emoji || 'reaction';
    if (emojiUrl) {
      return (
        <img
          src={emojiUrl}
          alt={emojiLabel}
          title={emojiLabel}
          style={{
            width: '14px',
            height: '14px',
            verticalAlign: 'middle'
          }}
        />
      );
    }
    return emojiLabel || '👍';
  };

  const getNotificationText = (type: string) => {
    switch (type) {
      case 'mention':
        return 'mentioned you';
      case 'reblog':
        return 'boosted your post';
      case 'favourite':
        return 'favourited your post';
      case 'follow':
        return 'followed you';
      case 'follow_request':
        return 'requested to follow you';
      case 'poll':
        return 'poll ended';
      case 'status':
        return 'posted';
      case 'pleroma:emoji_reaction':
        return 'reacted to your post';
      default:
        return 'notified you';
    }
  };

  if (notification.type === 'follow_request') {
    return (
      <div style={{
        padding: '8px',
        border: '1px solid #808080',
        backgroundColor: '#ffffff',
        marginBottom: '8px',
        fontFamily: 'MS Sans Serif, sans-serif',
        fontSize: '12px'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <img 
            src={notification.account.avatar} 
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
              <span style={{ fontSize: '14px', flexShrink: 0 }}>{renderNotificationIcon(notification)}</span>
              <strong 
                style={{ 
                  cursor: onUserClick ? 'pointer' : 'default',
                  textDecoration: onUserClick ? 'underline' : 'none',
                  color: onUserClick ? 'var(--win98-help-green)' : 'inherit',
                  flexShrink: 0
                }}
                onClick={() => onUserClick && onUserClick(notification.account.id)}
              >
                <ParsedContent html={displayName} emojis={notification.account.emojis} />
              </strong>
              <span 
                title={`@${notification.account.acct}`}
                style={{ 
                  color: '#808080', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  flex: 1
                }}
              >@{notification.account.acct}</span>
              <span style={{ color: '#808080', flexShrink: 0 }}>requested to follow you</span>
            </div>
            <div style={{ 
              fontSize: '11px', 
              color: '#808080' 
            }}>
              {formatDate(notification.created_at)}
            </div>
          </div>
        </div>

        {onFollowRequestApprove && onFollowRequestDeny && (
          <FollowRequestItem
            account={notification.account}
            onApprove={onFollowRequestApprove}
            onDeny={onFollowRequestDeny}
            onUserClick={onUserClick}
            compact={true}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{
      padding: '8px',
      border: '1px solid #808080',
      backgroundColor: '#ffffff',
      marginBottom: '8px',
      fontFamily: 'MS Sans Serif, sans-serif',
      fontSize: '12px'
    }}>
      {/* Notification header */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '8px'
      }}>
        <img 
          src={notification.account.avatar} 
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
            <span style={{ fontSize: '14px', flexShrink: 0 }}>{renderNotificationIcon(notification)}</span>
            <strong 
              style={{ 
                cursor: onUserClick ? 'pointer' : 'default',
                textDecoration: onUserClick ? 'underline' : 'none',
                color: onUserClick ? 'var(--win98-help-green)' : 'inherit',
                flexShrink: 0
              }}
              onClick={() => onUserClick && onUserClick(notification.account.id)}
            >
              <ParsedContent html={displayName} emojis={notification.account.emojis} />
            </strong>
            <span 
              title={`@${notification.account.acct}`}
              style={{ 
                color: '#808080', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                minWidth: 0,
                flex: 1
              }}
            >@{notification.account.acct}</span>
            <span style={{ color: '#808080', flexShrink: 0 }}>{getNotificationText(notification.type)}</span>
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#808080' 
          }}>
            {formatDate(notification.created_at)}
          </div>
        </div>
      </div>

      {/* Status content if present */}
      {notification.status && (
        <div style={{
          marginLeft: '40px',
          padding: '8px',
          backgroundColor: '#f8f8f8',
          border: '1px solid #e0e0e0',
          borderRadius: '2px'
        }}>
          {/* Spoiler warning if present */}
          {notification.status.spoiler_text && (
            <div style={{
              padding: '4px 8px',
              backgroundColor: '#ffffe0',
              border: '1px solid #ffcc00',
              marginBottom: '8px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              Content Warning: {notification.status.spoiler_text}
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
              html={notification.status.content}
              mentions={notification.status.mentions}
              emojis={notification.status.emojis}
              onUserClick={onUserClick}
              onYouTubeClick={onYouTubeClick}
            />
          </div>

          {/* Media attachments */}
          {notification.status.media_attachments.length > 0 && (
            <div style={{
              marginBottom: '8px',
              display: 'grid',
              gridTemplateColumns: notification.status.media_attachments.length === 1 ? '1fr' : 'repeat(2, 1fr)',
              gap: '4px'
            }}>
              {notification.status.media_attachments.map((media) => (
                <div key={media.id} style={{ border: '1px solid #808080' }}>
                  {media.type === 'image' && (
                    <img 
                      src={media.preview_url || media.url}
                      alt={media.description || 'Media attachment'}
                      style={{
                        width: '100%',
                        height: '80px',
                        objectFit: 'cover',
                        display: 'block',
                        cursor: 'pointer'
                      }}
                      onClick={() => onImageClick && onImageClick(media.url, media.description)}
                    />
                  )}
                  {media.type === 'video' && (
                    <div style={{
                      width: '100%',
                      height: '80px',
                      position: 'relative',
                      cursor: 'pointer',
                      backgroundColor: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #808080',
                      overflow: 'hidden'
                    }}
                    onClick={() => onVideoClick && onVideoClick(media.url, media.description)}
                    >
                      <video
                        src={media.url}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        muted
                        preload="metadata"
                      />
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        position: 'absolute',
                        zIndex: 1
                      }}>
                        ▶
                      </div>
                    </div>
                  )}
                  {media.type === 'audio' && (
                    <div style={{
                      padding: '10px',
                      textAlign: 'center',
                      backgroundColor: '#f0f0f0',
                      cursor: 'pointer'
                    }}
                    onClick={() => onAudioClick && onAudioClick(media.url, media.description)}
                    >
                      <img 
                        src="/volume_sheet-0.png" 
                        alt="Audio attachment" 
                        style={{
                          width: '32px',
                          height: '32px',
                          opacity: 0.7
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Action buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
            paddingTop: '4px',
            borderTop: '1px solid #e0e0e0'
          }}>
            {/* Reply emoji for mentions only */}
            {notification.type === 'mention' && onReplyClick && (
              <span
                style={{
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
                onClick={() => onReplyClick(notification.status!.id, [`@${notification.account.acct}`])}
                title="Reply to mention"
              >
                ↩️
              </span>
            )}
            
            {/* Visibility icon for conversation click */}
            <span 
              style={{ 
                cursor: onConversationClick ? 'pointer' : 'default',
                fontSize: '14px',
                marginLeft: 'auto'
              }}
              onClick={() => onConversationClick && onConversationClick(notification.status!.id)}
            >
              {notification.status!.visibility === 'public' ? '🌐' : 
               notification.status!.visibility === 'unlisted' ? '🔓' :
               notification.status!.visibility === 'private' ? '🔒' : '✉️'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(NotificationComponent);
