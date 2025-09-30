import React, { useState, useEffect, useRef } from 'react';

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

interface PostComponentProps {
  status: Status;
  onImageClick?: (imageUrl: string, description?: string) => void;
  onVideoClick?: (videoUrl: string, description?: string) => void;
}

const VideoThumbnail: React.FC<{ videoUrl: string; onVideoClick: () => void }> = ({ videoUrl, onVideoClick }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '120px',
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
          objectFit: 'cover'
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

const PostComponent: React.FC<PostComponentProps> = ({ status, onImageClick, onVideoClick }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const stripHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // If this is a boost/reblog, show the boost info and the original post
  if (status.reblog) {
    return (
      <div style={{
        padding: '8px',
        border: '1px solid #808080',
        backgroundColor: '#ffffff',
        marginBottom: '8px',
        fontFamily: 'MS Sans Serif, sans-serif',
        fontSize: '12px'
      }}>
        {/* Boost header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '6px',
          color: '#008000',
          fontSize: '11px'
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 8l4-4v3h5.5a2.5 2.5 0 010 5H9v-2h1.5a.5.5 0 000-1H5v3l-4-4zM15 8l-4 4V9H5.5a2.5 2.5 0 010-5H7v2H5.5a.5.5 0 000 1H11V4l4 4z"/>
          </svg>
          <strong>{status.account.display_name || status.account.username}</strong> boosted
        </div>
        
        {/* Original post */}
        <PostComponent status={status.reblog} onImageClick={onImageClick} onVideoClick={onVideoClick} />
      </div>
    );
  }

  // Regular post
  return (
    <div style={{
      padding: '8px',
      border: '1px solid #808080',
      backgroundColor: '#ffffff',
      marginBottom: '8px',
      fontFamily: 'MS Sans Serif, sans-serif',
      fontSize: '12px'
    }}>
      {/* Header with avatar and user info */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '8px'
      }}>
        <img 
          src={status.account.avatar} 
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
            <strong>{status.account.display_name || status.account.username}</strong>
            <span style={{ color: '#808080' }}>@{status.account.acct}</span>
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#808080' 
          }}>
            {formatDate(status.created_at)}
          </div>
        </div>
      </div>

      {/* Spoiler warning if present */}
      {status.spoiler_text && (
        <div style={{
          padding: '4px 8px',
          backgroundColor: '#ffffe0',
          border: '1px solid #ffcc00',
          marginBottom: '8px',
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          Content Warning: {status.spoiler_text}
        </div>
      )}

      {/* Post content */}
      <div style={{
        marginBottom: '8px',
        lineHeight: '1.4'
      }}>
        {stripHtml(status.content)}
      </div>

      {/* Media attachments */}
      {status.media_attachments.length > 0 && (
        <div style={{
          marginBottom: '8px',
          display: 'grid',
          gridTemplateColumns: status.media_attachments.length === 1 ? '1fr' : 'repeat(2, 1fr)',
          gap: '4px'
        }}>
          {status.media_attachments.map((media) => (
            <div key={media.id} style={{ border: '1px solid #808080' }}>
              {media.type === 'image' && (
                <img 
                  src={media.preview_url || media.url}
                  alt={media.description || 'Media attachment'}
                  style={{
                    width: '100%',
                    height: '120px',
                    objectFit: 'cover',
                    display: 'block',
                    cursor: 'pointer'
                  }}
                  onClick={() => onImageClick && onImageClick(media.url, media.description)}
                />
              )}
              {media.type === 'video' && (
                <VideoThumbnail
                  videoUrl={media.url}
                  onVideoClick={() => onVideoClick && onVideoClick(media.url, media.description)}
                />
              )}
              {media.type === 'audio' && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  backgroundColor: '#f0f0f0'
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
        <span>↩️ {formatNumber(status.replies_count)}</span>
        <span style={{ color: status.reblogged ? '#008000' : '#808080' }}>
          🔄 {formatNumber(status.reblogs_count)}
        </span>
        <span style={{ color: status.favourited ? '#ff0000' : '#808080' }}>
          ⭐ {formatNumber(status.favourites_count)}
        </span>
        <span style={{ marginLeft: 'auto' }}>
          {status.visibility === 'public' ? '🌐' : 
           status.visibility === 'unlisted' ? '🔓' :
           status.visibility === 'private' ? '🔒' : '✉️'}
        </span>
      </div>
    </div>
  );
};

export default PostComponent;