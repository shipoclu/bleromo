import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { DesktopWindow, type WindowMoveEvent, type WindowResizeEvent } from 'wtkrjs';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';

interface CustomEmoji {
  shortcode: string;
  url: string;
  static_url?: string;
  visible_in_picker?: boolean;
}

interface UserData {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  header: string;
  note: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
  emojis?: CustomEmoji[];
}

interface UserProfileWindowProps {
  id: string;
  onFollowersClick?: (userId: string, userDisplayName?: string, totalCount?: number) => void;
  onFollowingClick?: (userId: string, userDisplayName?: string, totalCount?: number) => void;
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

const UserProfileWindow: React.FC<UserProfileWindowProps> = ({
  id,
  onFollowersClick,
  onFollowingClick,
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
  const [userProfile, setUserProfile] = useState<UserData | null>(snap.userData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    if (!snap.accessToken || !snap.serverUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${snap.serverUrl}/api/v1/accounts/verify_credentials`, {
        headers: {
          'Authorization': `Bearer ${snap.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const userData = await response.json();
      setUserProfile(userData);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const stripHtml = useCallback((html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }, []);

  const processCustomEmoji = useCallback((content: string, emojis?: CustomEmoji[]) => {
    if (!emojis || emojis.length === 0) {
      return stripHtml(content);
    }

    let processedContent = stripHtml(content);
    
    emojis.forEach(emoji => {
      const emojiPattern = new RegExp(`:${emoji.shortcode}:`, 'g');
      const emojiImg = `<img src="${emoji.url}" alt=":${emoji.shortcode}:" style="height: 1.2em !important; width: auto !important; vertical-align: middle !important; display: inline !important; opacity: 1 !important; visibility: visible !important; transform: none !important;" />`;
      processedContent = processedContent.replace(emojiPattern, emojiImg);
    });

    return processedContent;
  }, [stripHtml]);

  const processedDisplayName = useMemo(() => {
    if (userProfile) {
      return processCustomEmoji(userProfile.display_name || userProfile.username, userProfile.emojis);
    }
    return '';
  }, [userProfile?.display_name, userProfile?.username, userProfile?.emojis, processCustomEmoji]);

  return (
    <DesktopWindow
      id={id}
      title="User Profile"
      initialPosition={{ x: 150, y: 80 }}
      initialSize={{ width: 450, height: 500 }}
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
        padding: '8px',
        overflow: 'auto',
        fontFamily: 'MS Sans Serif, sans-serif',
        fontSize: '12px'
      }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading profile...
          </div>
        )}

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
                onClick={fetchUserProfile}
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

        {userProfile && !isLoading && (
          <div>
            {/* Header with avatar and basic info */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              padding: '8px',
              border: '2px inset #c0c0c0',
              backgroundColor: '#ffffff'
            }}>
              <img 
                src={userProfile.avatar} 
                alt="Avatar"
                style={{
                  width: '64px',
                  height: '64px',
                  border: '2px inset #c0c0c0'
                }}
              />
              <div style={{ flex: 1 }}>
                <div 
                  style={{ 
                    fontWeight: 'bold', 
                    fontSize: '14px',
                    marginBottom: '4px' 
                  }}
                  dangerouslySetInnerHTML={{
                    __html: processedDisplayName
                  }}
                />
                <div style={{ 
                  color: '#000080',
                  marginBottom: '4px' 
                }}>
                  @{userProfile.acct}
                </div>
                <div style={{ fontSize: '11px', color: '#808080' }}>
                  {snap.serverUrl}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <div style={{
                flex: 1,
                textAlign: 'center',
                padding: '8px',
                border: '2px inset #c0c0c0',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ fontWeight: 'bold' }}>
                  {formatNumber(userProfile.statuses_count)}
                </div>
                <div style={{ fontSize: '11px' }}>Posts</div>
              </div>
              <button
                onClick={() => onFollowingClick && onFollowingClick(userProfile.id, userProfile.display_name || userProfile.username, userProfile.following_count)}
                disabled={!onFollowingClick}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px',
                  border: '2px outset #c0c0c0',
                  backgroundColor: '#c0c0c0',
                  cursor: onFollowingClick ? 'pointer' : 'default',
                  fontFamily: 'MS Sans Serif, sans-serif',
                  fontSize: '12px'
                }}
                onMouseDown={(e) => onFollowingClick && (e.currentTarget.style.border = '2px inset #c0c0c0')}
                onMouseUp={(e) => onFollowingClick && (e.currentTarget.style.border = '2px outset #c0c0c0')}
                onMouseLeave={(e) => onFollowingClick && (e.currentTarget.style.border = '2px outset #c0c0c0')}
              >
                <div style={{ fontWeight: 'bold' }}>
                  {formatNumber(userProfile.following_count)}
                </div>
                <div style={{ fontSize: '11px' }}>Following</div>
              </button>
              <button
                onClick={() => onFollowersClick && onFollowersClick(userProfile.id, userProfile.display_name || userProfile.username, userProfile.followers_count)}
                disabled={!onFollowersClick}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px',
                  border: '2px outset #c0c0c0',
                  backgroundColor: '#c0c0c0',
                  cursor: onFollowersClick ? 'pointer' : 'default',
                  fontFamily: 'MS Sans Serif, sans-serif',
                  fontSize: '12px'
                }}
                onMouseDown={(e) => onFollowersClick && (e.currentTarget.style.border = '2px inset #c0c0c0')}
                onMouseUp={(e) => onFollowersClick && (e.currentTarget.style.border = '2px outset #c0c0c0')}
                onMouseLeave={(e) => onFollowersClick && (e.currentTarget.style.border = '2px outset #c0c0c0')}
              >
                <div style={{ fontWeight: 'bold' }}>
                  {formatNumber(userProfile.followers_count)}
                </div>
                <div style={{ fontSize: '11px' }}>Followers</div>
              </button>
            </div>

            {/* Bio */}
            {userProfile.note && (
              <div style={{
                marginBottom: '16px',
                padding: '8px',
                border: '2px inset #c0c0c0',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  marginBottom: '6px',
                  fontSize: '12px' 
                }}>
                  Bio:
                </div>
                <div style={{ lineHeight: '1.4' }}>
                  {stripHtml(userProfile.note)}
                </div>
              </div>
            )}

            {/* Header image */}
            {userProfile.header && userProfile.header !== userProfile.avatar && (
              <div style={{
                marginBottom: '16px',
                border: '2px inset #c0c0c0'
              }}>
                <img 
                  src={userProfile.header} 
                  alt="Header"
                  style={{
                    width: '100%',
                    height: '120px',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </div>
            )}

            {/* Refresh button */}
            <div style={{ textAlign: 'center' }}>
              <button 
                onClick={fetchUserProfile}
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
                {isLoading ? 'Refreshing...' : 'Refresh Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DesktopWindow>
  );
};

export default React.memo(UserProfileWindow);