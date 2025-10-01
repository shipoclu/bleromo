import React, { useEffect, useState } from 'react';
import { DesktopWindow } from 'wtkrjs';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';
import UserConnectionComponent from './UserConnectionComponent';

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

interface FollowingWindowProps {
  id: string;
  userId: string;
  userDisplayName?: string;
  totalCount?: number;
  onUserClick?: (userId: string) => void;
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

const FollowingWindow: React.FC<FollowingWindowProps> = ({
  id,
  userId,
  userDisplayName,
  totalCount,
  onUserClick,
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
  const [following, setFollowing] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxId, setMaxId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchFollowing = async (loadMore = false) => {
    if (!snap.accessToken || !snap.serverUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '40'
      });
      
      if (loadMore && maxId) {
        params.append('max_id', maxId);
      }

      const response = await fetch(`${snap.serverUrl}/api/v1/accounts/${userId}/following?${params}`, {
        headers: {
          'Authorization': `Bearer ${snap.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch following: ${response.status}`);
      }

      const newFollowing: Account[] = await response.json();

      // Get relationship information for these accounts
      let followingWithRelationships = newFollowing;
      if (newFollowing.length > 0) {
        try {
          const accountIds = newFollowing.map(account => account.id);
          const relationshipsResponse = await fetch(`${snap.serverUrl}/api/v1/accounts/relationships?${accountIds.map(id => `id[]=${id}`).join('&')}`, {
            headers: {
              'Authorization': `Bearer ${snap.accessToken}`
            }
          });

          if (relationshipsResponse.ok) {
            const relationships = await relationshipsResponse.json();
            followingWithRelationships = newFollowing.map(account => {
              const relationship = relationships.find((rel: any) => rel.id === account.id);
              return {
                ...account,
                following: relationship?.following || false,
                followed_by: relationship?.followed_by || false
              };
            });
          }
        } catch (error) {
          console.warn('Failed to fetch relationship data:', error);
        }
      }

      if (loadMore) {
        setFollowing(prev => [...prev, ...followingWithRelationships]);
      } else {
        setFollowing(followingWithRelationships);
      }

      // Set up pagination
      if (newFollowing.length > 0) {
        setMaxId(newFollowing[newFollowing.length - 1].id);
        setHasMore(newFollowing.length === 40); // Full page means there might be more
      } else {
        if (loadMore) {
          setHasMore(false);
        }
      }

    } catch (err) {
      console.error('Error fetching following:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowClick = async (targetUserId: string, currentlyFollowing: boolean): Promise<{ following: boolean }> => {
    if (!snap.accessToken || !snap.serverUrl) {
      throw new Error('Not authenticated');
    }

    const endpoint = currentlyFollowing ? 'unfollow' : 'follow';
    const response = await fetch(`${snap.serverUrl}/api/v1/accounts/${targetUserId}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${snap.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to ${endpoint} user: ${response.status}`);
    }

    const relationship = await response.json();
    return {
      following: relationship.following
    };
  };

  const handleRefresh = () => {
    setMaxId(null);
    setHasMore(true);
    fetchFollowing(false);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchFollowing(true);
    }
  };

  useEffect(() => {
    fetchFollowing();
  }, [userId]);

  return (
    <DesktopWindow
      id={id}
      title={`Following${userDisplayName ? ` - ${userDisplayName}` : ''}`}
      initialPosition={{ x: 200, y: 150 }}
      initialSize={{ width: 400, height: 500 }}
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
            {totalCount !== undefined ? `${totalCount} total following` : `${following.length} following`}
          </span>
        </div>

        {/* Content area */}
        <div style={{
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

          {following.length === 0 && !isLoading && !error && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#808080'
            }}>
              Not following anyone
            </div>
          )}

          {following.map((followedUser) => (
            <UserConnectionComponent
              key={followedUser.id}
              user={followedUser}
              onUserClick={onUserClick}
              onFollowClick={handleFollowClick}
            />
          ))}

          {/* Load more button */}
          {hasMore && following.length > 0 && (
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

          {!hasMore && following.length > 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px',
              color: '#808080',
              fontSize: '11px'
            }}>
              End of following list
            </div>
          )}
        </div>
      </div>
    </DesktopWindow>
  );
};

export default FollowingWindow;