import React from 'react';

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

interface Status {
  id: string;
  created_at: string;
  account: Account;
  content: string;
  visibility: 'public' | 'unlisted' | 'private' | 'direct';
  spoiler_text: string;
  emojis?: CustomEmoji[];
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

interface NotificationComponentProps {
  notification: Notification;
  onImageClick?: (imageUrl: string, description?: string) => void;
  onVideoClick?: (videoUrl: string, description?: string) => void;
  onConversationClick?: (statusId: string) => void;
  onUserClick?: (userId: string) => void;
  onReplyClick?: (statusId: string, mentionHandles: string[]) => void;
}

const NotificationComponent: React.FC<NotificationComponentProps> = ({ 
  notification, 
  onImageClick, 
  onVideoClick,
  onConversationClick,
  onUserClick,
  onReplyClick
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const stripHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const processCustomEmoji = (content: string, emojis?: CustomEmoji[]) => {
    if (!emojis || emojis.length === 0) {
      return stripHtml(content);
    }

    let processedContent = stripHtml(content);
    
    emojis.forEach(emoji => {
      const emojiPattern = new RegExp(`:${emoji.shortcode}:`, 'g');
      const emojiImg = `<img src="${emoji.url}" alt=":${emoji.shortcode}:" style="height: 1.2em; width: auto; vertical-align: middle; display: inline;" />`;
      processedContent = processedContent.replace(emojiPattern, emojiImg);
    });

    return processedContent;
  };

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
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            marginBottom: '2px'
          }}>
            <span style={{ fontSize: '14px' }}>{getNotificationIcon(notification.type, notification.emoji)}</span>
            <strong 
              style={{ 
                cursor: onUserClick ? 'pointer' : 'default',
                textDecoration: onUserClick ? 'underline' : 'none'
              }}
              onClick={() => onUserClick && onUserClick(notification.account.id)}
              dangerouslySetInnerHTML={{
                __html: processCustomEmoji(notification.account.display_name || notification.account.username, notification.account.emojis)
              }}
            />
            <span style={{ color: '#808080' }}>@{notification.account.acct}</span>
            <span style={{ color: '#808080' }}>{getNotificationText(notification.type)}</span>
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
            dangerouslySetInnerHTML={{
              __html: processCustomEmoji(notification.status.content, notification.status.emojis)
            }}
          />

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
                      backgroundColor: '#f0f0f0'
                    }}>
                      <audio src={media.url} controls style={{ width: '100%', height: '30px' }} />
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

export default NotificationComponent;