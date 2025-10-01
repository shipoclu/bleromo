import React, { useState } from 'react';

interface Account {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  url: string;
  following?: boolean;
  followed_by?: boolean;
  emojis?: Array<{
    shortcode: string;
    url: string;
    static_url?: string;
    visible_in_picker?: boolean;
  }>;
}

interface UserConnectionComponentProps {
  user: Account;
  onUserClick?: (userId: string) => void;
  onFollowClick?: (userId: string, currentlyFollowing: boolean) => Promise<{ following: boolean }>;
}

const UserConnectionComponent: React.FC<UserConnectionComponentProps> = ({
  user,
  onUserClick,
  onFollowClick
}) => {
  const [isFollowing, setIsFollowing] = useState(user.following || false);
  const [isLoading, setIsLoading] = useState(false);

  const processCustomEmoji = (content: string, emojis?: Array<{ shortcode: string; url: string }>) => {
    if (!emojis || emojis.length === 0) {
      return content;
    }

    let processedContent = content;
    
    emojis.forEach(emoji => {
      const emojiPattern = new RegExp(`:${emoji.shortcode}:`, 'g');
      const emojiImg = `<img src="${emoji.url}" alt=":${emoji.shortcode}:" style="height: 1.2em !important; width: auto !important; vertical-align: middle !important; display: inline !important;" />`;
      processedContent = processedContent.replace(emojiPattern, emojiImg);
    });

    return processedContent;
  };

  const handleFollowClick = async () => {
    if (!onFollowClick || isLoading) return;

    setIsLoading(true);
    try {
      const result = await onFollowClick(user.id, isFollowing);
      setIsFollowing(result.following);
    } catch (error) {
      console.error('Error toggling follow status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      padding: '8px',
      border: '1px solid #808080',
      backgroundColor: '#ffffff',
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontFamily: 'MS Sans Serif, sans-serif',
      fontSize: '12px'
    }}>
      {/* Avatar */}
      <img 
        src={user.avatar} 
        alt="Avatar"
        style={{
          width: '40px',
          height: '40px',
          border: '1px solid #808080',
          cursor: onUserClick ? 'pointer' : 'default'
        }}
        onClick={() => onUserClick && onUserClick(user.id)}
      />

      {/* User info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div 
          style={{
            fontWeight: 'bold',
            cursor: onUserClick ? 'pointer' : 'default',
            color: onUserClick ? 'var(--win98-help-green)' : 'inherit',
            textDecoration: onUserClick ? 'underline' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          onClick={() => onUserClick && onUserClick(user.id)}
          dangerouslySetInnerHTML={{
            __html: processCustomEmoji(user.display_name || user.username, user.emojis)
          }}
        />
        <div 
          style={{
            color: '#808080',
            fontSize: '11px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={`@${user.acct}`}
        >
          @{user.acct}
        </div>
      </div>

      {/* Follow indicators and button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Follows you indicator */}
        {user.followed_by && (
          <span style={{
            fontSize: '10px',
            color: '#808080',
            backgroundColor: '#f0f0f0',
            padding: '2px 4px',
            border: '1px solid #c0c0c0'
          }}>
            Follows you
          </span>
        )}

        {/* Follow/Unfollow button */}
        {onFollowClick && (
          <button
            onClick={handleFollowClick}
            disabled={isLoading}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              border: '2px outset #c0c0c0',
              backgroundColor: isFollowing ? '#e0e0e0' : '#c0c0c0',
              cursor: isLoading ? 'default' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              fontFamily: 'MS Sans Serif, sans-serif',
              minWidth: '60px'
            }}
            onMouseDown={(e) => !isLoading && (e.currentTarget.style.border = '2px inset #c0c0c0')}
            onMouseUp={(e) => !isLoading && (e.currentTarget.style.border = '2px outset #c0c0c0')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.border = '2px outset #c0c0c0')}
          >
            {isLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
          </button>
        )}
      </div>
    </div>
  );
};

export default UserConnectionComponent;