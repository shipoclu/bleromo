import React, { useState, useEffect, useRef } from 'react';
import { DesktopWindow } from 'wtkrjs';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';

interface ReplyToStatus {
  id: string;
  account: {
    display_name: string;
    username: string;
    acct: string;
  };
  content: string;
  created_at: string;
}

interface PostCompositionWindowProps {
  id: string;
  replyToStatusId?: string;
  mentionHandles?: string[];
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

const PostCompositionWindow: React.FC<PostCompositionWindowProps> = ({
  id,
  replyToStatusId,
  mentionHandles = [],
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
  const [summary, setSummary] = useState('');
  const [postBody, setPostBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sensitiveMedia, setSensitiveMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyToStatus, setReplyToStatus] = useState<ReplyToStatus | null>(null);
  const [loadingReplyInfo, setLoadingReplyInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch reply status information when replyToStatusId is provided
  useEffect(() => {
    if (replyToStatusId && snap.accessToken && snap.serverUrl) {
      setLoadingReplyInfo(true);
      fetch(`${snap.serverUrl}/api/v1/statuses/${replyToStatusId}`, {
        headers: {
          'Authorization': `Bearer ${snap.accessToken}`
        }
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Failed to fetch reply status');
      })
      .then(status => {
        setReplyToStatus({
          id: status.id,
          account: {
            display_name: status.account.display_name,
            username: status.account.username,
            acct: status.account.acct
          },
          content: status.content,
          created_at: status.created_at
        });
      })
      .catch(error => {
        console.error('Error fetching reply status:', error);
      })
      .finally(() => {
        setLoadingReplyInfo(false);
      });
    }
  }, [replyToStatusId, snap.accessToken, snap.serverUrl]);

  // Pre-populate mentions when component mounts
  useEffect(() => {
    if (mentionHandles && mentionHandles.length > 0 && snap.userData) {
      // Filter out the current user's handle
      const filteredHandles = mentionHandles.filter(handle => {
        // Compare both username and acct formats
        const currentUserHandle = snap.userData!.acct || snap.userData!.username;
        return handle !== currentUserHandle && handle !== snap.userData!.username;
      });
      
      if (filteredHandles.length > 0) {
        const mentions = filteredHandles.map(handle => `@${handle}`).join(' ');
        setPostBody(mentions + ' ');
      }
    }
  }, [mentionHandles, snap.userData]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!snap.accessToken || !snap.serverUrl) {
      setError('Not authenticated');
      return;
    }

    if (!postBody.trim() && attachments.length === 0) {
      setError('Post body or attachments required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // First upload any attachments
      const mediaIds: string[] = [];
      
      for (const file of attachments) {
        const formData = new FormData();
        formData.append('file', file);
        if (file.name) {
          formData.append('description', file.name);
        }

        const mediaResponse = await fetch(`${snap.serverUrl}/api/v2/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${snap.accessToken}`
          },
          body: formData
        });

        if (!mediaResponse.ok) {
          const errorData = await mediaResponse.text();
          throw new Error(`Failed to upload media: ${mediaResponse.status} - ${errorData}`);
        }

        const mediaData = await mediaResponse.json();
        mediaIds.push(mediaData.id);
      }

      // Now create the status
      const statusData: any = {
        status: postBody.trim(),
        visibility: 'public'
      };

      if (summary.trim()) {
        statusData.spoiler_text = summary.trim();
      }

      if (replyToStatusId) {
        statusData.in_reply_to_id = replyToStatusId;
      }

      if (mediaIds.length > 0) {
        statusData.media_ids = mediaIds;
      }

      if (sensitiveMedia && mediaIds.length > 0) {
        statusData.sensitive = true;
      }

      const response = await fetch(`${snap.serverUrl}/api/v1/statuses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${snap.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(statusData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Post submission error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorData,
          sentData: statusData
        });
        throw new Error(`Failed to post status: ${response.status} - ${errorData}`);
      }

      const newStatus = await response.json();
      console.log('Successfully posted status:', newStatus);

      // Clear form and close window on success
      setSummary('');
      setPostBody('');
      setAttachments([]);
      setSensitiveMedia(false);
      onClose();

    } catch (err) {
      console.error('Full error details:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWindowTitle = () => {
    if (replyToStatusId) {
      return 'Reply to Post';
    }
    return 'Compose Post';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const stripHtmlTags = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <DesktopWindow
      id={id}
      title={getWindowTitle()}
      initialPosition={{ x: 220, y: 140 }}
      initialSize={{ width: 500, height: 450 }}
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
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'MS Sans Serif, sans-serif',
        fontSize: '12px',
        gap: '8px'
      }}>
        {/* Reply Context */}
        {replyToStatusId && (
          <div style={{
            border: '2px inset #c0c0c0',
            backgroundColor: '#ffffff',
            padding: '8px',
            fontSize: '11px'
          }}>
            <div style={{ 
              fontWeight: 'bold', 
              marginBottom: '4px',
              color: '#000080'
            }}>
              Replying to:
            </div>
            {loadingReplyInfo ? (
              <div style={{ color: '#808080', fontStyle: 'italic' }}>
                Loading reply information...
              </div>
            ) : replyToStatus ? (
              <div>
                <div style={{ marginBottom: '2px' }}>
                  <strong>{replyToStatus.account.display_name}</strong> (@{replyToStatus.account.acct || replyToStatus.account.username})
                </div>
                <div style={{ color: '#404040' }}>
                  {truncateText(stripHtmlTags(replyToStatus.content), 100)}
                </div>
              </div>
            ) : (
              <div style={{ color: '#800000', fontStyle: 'italic' }}>
                Could not load original post
              </div>
            )}
          </div>
        )}

        {/* Summary/Content Warning */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Content Warning / Summary (optional):
          </label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Content warning or summary..."
            style={{
              width: '100%',
              padding: '4px',
              border: '2px inset #c0c0c0',
              fontSize: '12px',
              fontFamily: 'MS Sans Serif, sans-serif'
            }}
          />
        </div>

        {/* Post Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Post Content:
          </label>
          <textarea
            value={postBody}
            onChange={(e) => setPostBody(e.target.value)}
            placeholder={replyToStatusId ? "Write your reply..." : "What's happening?"}
            style={{
              flex: 1,
              padding: '4px',
              border: '2px inset #c0c0c0',
              fontSize: '12px',
              fontFamily: 'MS Sans Serif, sans-serif',
              resize: 'none',
              minHeight: '120px'
            }}
          />
          <div style={{ 
            fontSize: '11px', 
            color: '#808080', 
            textAlign: 'right', 
            marginTop: '2px' 
          }}>
            {postBody.length} characters
          </div>
        </div>

        {/* Attachments */}
        <div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '4px'
          }}>
            <label style={{ fontWeight: 'bold' }}>Attachments:</label>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '2px 8px',
                fontSize: '12px',
                border: '2px outset #c0c0c0',
                backgroundColor: '#c0c0c0',
                cursor: 'pointer'
              }}
            >
              Add File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
          
          {attachments.length > 0 && (
            <div style={{
              border: '2px inset #c0c0c0',
              padding: '4px',
              backgroundColor: '#ffffff',
              maxHeight: '80px',
              overflowY: 'auto'
            }}>
              {attachments.map((file, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '2px',
                  fontSize: '11px'
                }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {file.name} ({formatFileSize(file.size)})
                  </span>
                  <button
                    onClick={() => removeAttachment(index)}
                    style={{
                      marginLeft: '8px',
                      padding: '1px 4px',
                      fontSize: '10px',
                      border: '1px outset #c0c0c0',
                      backgroundColor: '#c0c0c0',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {attachments.length > 0 && (
            <div style={{ marginTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="checkbox"
                  checked={sensitiveMedia}
                  onChange={(e) => setSensitiveMedia(e.target.checked)}
                />
                Mark media as sensitive
              </label>
            </div>
          )}
        </div>

        {/* Submit Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '8px',
          borderTop: '1px solid #808080'
        }}>
          <div style={{ flex: 1 }}>
            {error && (
              <div style={{ 
                color: '#800000', 
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                Error: {error}
              </div>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!postBody.trim() && attachments.length === 0)}
            style={{
              padding: '6px 20px',
              fontSize: '12px',
              border: '2px outset #c0c0c0',
              backgroundColor: '#c0c0c0',
              cursor: (isSubmitting || (!postBody.trim() && attachments.length === 0)) ? 'default' : 'pointer',
              opacity: (isSubmitting || (!postBody.trim() && attachments.length === 0)) ? 0.6 : 1
            }}
          >
            {isSubmitting ? 'Posting...' : (replyToStatusId ? 'Reply' : 'Post')}
          </button>
        </div>
      </div>
    </DesktopWindow>
  );
};

export default PostCompositionWindow;