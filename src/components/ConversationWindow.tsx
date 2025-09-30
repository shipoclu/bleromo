import React, { useEffect, useState } from 'react';
import { DesktopWindow } from 'wtkrjs';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';
import PostComponent from './PostComponent';
import { updatePostEngagementCounts } from '../utils/postUpdates';

interface Account {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  url: string;
}

interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'unknown';
  url: string;
  preview_url: string;
  description?: string;
}

interface Status {
  id: string;
  created_at: string;
  account: Account;
  content: string;
  visibility: 'public' | 'unlisted' | 'private' | 'direct';
  spoiler_text: string;
  media_attachments: MediaAttachment[];
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  reblogged: boolean;
  favourited: boolean;
  reblog?: Status;
  url: string;
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
  onConversationClick?: (statusId: string) => void;
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

const ConversationWindow: React.FC<ConversationWindowProps> = ({
  id,
  statusId,
  onImageClick,
  onVideoClick,
  onConversationClick,
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
  const [conversation, setConversation] = useState<ConversationContext | null>(null);
  const [originalStatus, setOriginalStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversation = async () => {
    if (!snap.accessToken || !snap.serverUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch the original status and its context
      const [statusResponse, contextResponse] = await Promise.all([
        fetch(`${snap.serverUrl}/api/v1/statuses/${statusId}`, {
          headers: {
            'Authorization': `Bearer ${snap.accessToken}`
          }
        }),
        fetch(`${snap.serverUrl}/api/v1/statuses/${statusId}/context`, {
          headers: {
            'Authorization': `Bearer ${snap.accessToken}`
          }
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

      setOriginalStatus(status);
      setConversation(context);

      // Update engagement counts for all posts in conversation
      const allPosts = [status, ...context.ancestors, ...context.descendants];
      setTimeout(() => {
        updatePostEngagementCounts(allPosts, 'Conversation');
      }, 100);

    } catch (err) {
      console.error('Error fetching conversation:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchConversation();
  };

  useEffect(() => {
    fetchConversation();
  }, [statusId]);

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
            {getAllPosts().length} posts in conversation
          </span>
        </div>

        {/* Content area */}
        <div 
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
            <div key={status.id} style={{ position: 'relative' }}>
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
                  onConversationClick={onConversationClick}
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