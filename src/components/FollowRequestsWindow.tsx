import React, { useEffect, useState } from 'react';
import { DesktopWindow, type WindowMoveEvent, type WindowResizeEvent } from 'wtkrjs';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';
import FollowRequestItem from './FollowRequestItem';
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

interface FollowRequestsWindowProps {
  id: string;
  onUserClick?: (userId: string) => void;
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

const FollowRequestsWindow: React.FC<FollowRequestsWindowProps> = ({
  id,
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
  const { createController, releaseController, isMountedRef } = useAbortControllers();
  const [requests, setRequests] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxId, setMaxId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchRequests = async (loadMore = false) => {
    if (!snap.accessToken || !snap.serverUrl) return;

    const controller = createController();
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams({
        limit: '40'
      });

      if (loadMore && maxId) {
        params.append('max_id', maxId);
      }

      const response = await fetch(`${snap.serverUrl}/api/v1/follow_requests?${params}`, {
        headers: {
          'Authorization': `Bearer ${snap.accessToken}`
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch follow requests: ${response.status}`);
      }

      const newRequests: Account[] = await response.json();
      if (!isMountedRef.current || controller.signal.aborted) return;

      if (loadMore) {
        setRequests(prev => [...prev, ...newRequests]);
      } else {
        setRequests(newRequests);
      }

      if (newRequests.length > 0) {
        setMaxId(newRequests[newRequests.length - 1].id);
        setHasMore(newRequests.length === 40);
      } else if (loadMore) {
        setHasMore(false);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Error fetching follow requests:', err);
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
    setMaxId(null);
    setHasMore(true);
    fetchRequests(false);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchRequests(true);
    }
  };

  const handleApprove = async (accountId: string) => {
    if (!snap.accessToken || !snap.serverUrl) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${snap.serverUrl}/api/v1/follow_requests/${accountId}/authorize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${snap.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to approve follow request: ${response.status}`);
    }
  };

  const handleDeny = async (accountId: string) => {
    if (!snap.accessToken || !snap.serverUrl) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${snap.serverUrl}/api/v1/follow_requests/${accountId}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${snap.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to deny follow request: ${response.status}`);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <DesktopWindow
      id={id}
      title="Follow Requests"
      initialPosition={{ x: 220, y: 160 }}
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
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--win98-font)',
        fontSize: '12px'
      }}>
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
            {requests.length} requests
          </span>
        </div>

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

          {requests.length === 0 && !isLoading && !error && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#808080'
            }}>
              No follow requests
            </div>
          )}

          {requests.map(request => (
            <FollowRequestItem
              key={request.id}
              account={request}
              onApprove={handleApprove}
              onDeny={handleDeny}
              onUserClick={onUserClick}
            />
          ))}

          {hasMore && requests.length > 0 && (
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

          {!hasMore && requests.length > 0 && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: '#808080',
              fontSize: '11px'
            }}>
              End of requests
            </div>
          )}
        </div>
      </div>
    </DesktopWindow>
  );
};

export default FollowRequestsWindow;
