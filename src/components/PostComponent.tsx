import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DesktopMenu, type Position } from 'wtkrjs';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';
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
  bookmarked: boolean;
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
  onAudioClick?: (audioUrl: string, description?: string) => void;
  onYouTubeClick?: (videoId: string, videoUrl: string) => void;
  onConversationClick?: (statusId: string) => void;
  onUserClick?: (userId: string) => void;
  onReplyClick?: (statusId: string, mentionHandles: string[]) => void;
  onFavoriteClick?: (statusId: string, currentlyFavorited: boolean) => Promise<{ favourited: boolean; favourites_count: number }>;
  onReblogClick?: (statusId: string, currentlyReblogged: boolean) => Promise<{ reblogged: boolean; reblogs_count: number }>;
  onEmojiReactClick?: (statusId: string, emojiName: string, currentlyReacted: boolean) => Promise<EmojiReaction[]>;
  onEmojiPickerClick?: (statusId: string) => void;
  onBookmarkClick?: (statusId: string, currentlyBookmarked: boolean) => Promise<{ bookmarked: boolean }>;
  onRawPostClick?: (statusId: string, jsonData: any) => void;
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

const PostComponent: React.FC<PostComponentProps> = ({ status, onImageClick, onVideoClick, onAudioClick, onYouTubeClick, onConversationClick, onUserClick, onReplyClick, onFavoriteClick, onReblogClick, onEmojiReactClick, onEmojiPickerClick, onBookmarkClick, onRawPostClick }) => {
  const snap = useSnapshot(appState);
  const [localStatus, setLocalStatus] = useState(status);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isReblogging, setIsReblogging] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [showSensitiveMedia, setShowSensitiveMedia] = useState(false);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<Position>({ x: 0, y: 0 });
  const postRef = useRef<HTMLDivElement | null>(null);

  // Update local status when prop changes
  useEffect(() => {
    setLocalStatus(status);
  }, [status]);

  // Listen for emoji reaction updates from the engagement count system
  useEffect(() => {
    const handleEmojiUpdate = (event: CustomEvent) => {
      const { statusId, reactions } = event.detail;
      if (statusId === localStatus.id) {
        console.log('🎨 Received emoji update event for status:', statusId, reactions);
        setLocalStatus(prev => ({
          ...prev,
          emoji_reactions: reactions,
          pleroma: {
            ...prev.pleroma,
            emoji_reactions: reactions
          }
        }));
      }
    };

    const postElement = postRef.current;
    if (postElement) {
      postElement.addEventListener('emojiReactionsUpdate', handleEmojiUpdate as EventListener);
      return () => {
        postElement.removeEventListener('emojiReactionsUpdate', handleEmojiUpdate as EventListener);
      };
    }
  }, [localStatus.id]);
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const stripHtml = useCallback((html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }, []);

  const extractYouTubeVideoId = useCallback((url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }, []);

  const processPostContentToElements = useCallback((content: string, emojis?: CustomEmoji[], mentions?: Array<{id: string; username: string; acct: string; url: string}>, onUserClick?: (userId: string) => void, onYouTubeClick?: (videoId: string, videoUrl: string) => void): React.ReactNode[] => {
    let processedContent = stripHtml(content);
    const parts: React.ReactNode[] = [];
    
    // Create a map of all patterns (emoji, mentions, and URLs) and their positions
    const matches: Array<{ 
      index: number; 
      length: number; 
      type: 'emoji' | 'mention' | 'url' | 'youtube'; 
      data: CustomEmoji | {id: string; username: string; acct: string; url: string} | string; 
      matchIndex: number 
    }> = [];
    
    // Find emoji patterns
    if (emojis && emojis.length > 0) {
      emojis.forEach((emoji, emojiIndex) => {
        const emojiPattern = new RegExp(`:${emoji.shortcode}:`, 'g');
        let match;
        
        while ((match = emojiPattern.exec(processedContent)) !== null) {
          matches.push({
            index: match.index,
            length: match[0].length,
            type: 'emoji',
            data: emoji,
            matchIndex: emojiIndex * 10000 + match.index // unique key for emoji
          });
        }
      });
    }
    
    // Find mention patterns using the mentions array from the API
    if (mentions && mentions.length > 0) {
      mentions.forEach((mention, mentionIndex) => {
        // First try to match the full @username@domain format if it exists in content
        const fullPattern = `@${mention.acct}`;
        const escapedFullPattern = fullPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const fullRegex = new RegExp(escapedFullPattern, 'g');
        let foundFullMatch = false;
        let match;
        
        // Check if the full pattern exists
        while ((match = fullRegex.exec(processedContent)) !== null) {
          matches.push({
            index: match.index,
            length: match[0].length,
            type: 'mention',
            data: mention,
            matchIndex: 20000 + mentionIndex * 1000 + match.index // unique key for mentions
          });
          foundFullMatch = true;
        }
        
        // Reset regex for the shorter pattern check
        const shortPattern = `@${mention.username}`;
        const escapedShortPattern = shortPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const shortRegex = new RegExp(escapedShortPattern, 'g');
        
        // Only try the shorter pattern if we didn't find the full pattern
        if (!foundFullMatch) {
          while ((match = shortRegex.exec(processedContent)) !== null) {
            matches.push({
              index: match.index,
              length: match[0].length,
              type: 'mention',
              data: mention,
              matchIndex: 20000 + mentionIndex * 1000 + match.index // unique key for mentions
            });
          }
        }
      });
    }
    
    // Find URL patterns - exclude emoji and other unicode characters that should end URLs
    const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`[\]\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]+)/gu;
    let urlMatch;
    
    while ((urlMatch = urlPattern.exec(processedContent)) !== null) {
      const url = urlMatch[1];
      const videoId = extractYouTubeVideoId(url);
      
      if (videoId) {
        // This is a YouTube URL
        matches.push({
          index: urlMatch.index,
          length: urlMatch[0].length,
          type: 'youtube',
          data: url,
          matchIndex: 30000 + urlMatch.index // unique key for YouTube URLs
        });
      } else {
        // This is a regular URL
        matches.push({
          index: urlMatch.index,
          length: urlMatch[0].length,
          type: 'url',
          data: url,
          matchIndex: 40000 + urlMatch.index // unique key for regular URLs
        });
      }
    }
    
    // Sort matches by position
    matches.sort((a, b) => a.index - b.index);
    
    let lastIndex = 0;
    matches.forEach((match) => {
      // Add text before this match
      if (match.index > lastIndex) {
        const textPart = processedContent.slice(lastIndex, match.index);
        if (textPart) {
          parts.push(textPart);
        }
      }
      
      if (match.type === 'emoji') {
        // Add emoji as React element
        const emoji = match.data as CustomEmoji;
        parts.push(
          <img 
            key={`emoji-${match.matchIndex}`}
            src={emoji.url} 
            alt={`:${emoji.shortcode}:`}
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
      } else if (match.type === 'mention') {
        // Add mention as clickable React element
        const mention = match.data as {id: string; username: string; acct: string; url: string};
        const fullMention = processedContent.slice(match.index, match.index + match.length);
        
        parts.push(
          <span
            key={`mention-${match.matchIndex}`}
            style={{
              color: 'var(--win98-help-green)',
              textDecoration: 'none',
              cursor: onUserClick ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (onUserClick) {
                // Use the actual user ID from the mention object
                onUserClick(mention.id);
              }
            }}
            title={`View profile of @${mention.acct}`}
          >
            {fullMention}
          </span>
        );
      } else if (match.type === 'youtube') {
        // Add YouTube URL as clickable red link
        const url = match.data as string;
        const videoId = extractYouTubeVideoId(url);
        
        parts.push(
          <span
            key={`youtube-${match.matchIndex}`}
            style={{
              color: '#ff0000',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (onYouTubeClick && videoId) {
                onYouTubeClick(videoId, url);
              }
            }}
            title={`Open YouTube video: ${url}`}
          >
            {url}
          </span>
        );
      } else if (match.type === 'url') {
        // Add regular URL as clickable blue link
        const url = match.data as string;
        
        parts.push(
          <a
            key={`url-${match.matchIndex}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#0000ff',
              textDecoration: 'underline'
            }}
          >
            {url}
          </a>
        );
      }
      
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
  }, [stripHtml, extractYouTubeVideoId]);

  // Memoize processed content to avoid re-processing during re-renders
  const processedDisplayName = useMemo(() => {
    return processPostContentToElements(localStatus.account.display_name || localStatus.account.username, localStatus.account.emojis, undefined, onUserClick, onYouTubeClick);
  }, [localStatus.account.display_name, localStatus.account.username, localStatus.account.emojis, processPostContentToElements, onUserClick, onYouTubeClick]);

  const processedContent = useMemo(() => {
    return processPostContentToElements(localStatus.content, localStatus.emojis, localStatus.mentions, onUserClick, onYouTubeClick);
  }, [localStatus.content, localStatus.emojis, localStatus.mentions, processPostContentToElements, onUserClick, onYouTubeClick]);

  const processedReblogDisplayName = useMemo(() => {
    if (localStatus.reblog) {
      return processPostContentToElements(localStatus.account.display_name || localStatus.account.username, localStatus.account.emojis, undefined, onUserClick, onYouTubeClick);
    }
    return [];
  }, [localStatus.reblog, localStatus.account.display_name, localStatus.account.username, localStatus.account.emojis, processPostContentToElements, onUserClick, onYouTubeClick]);

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


  const handlePostActionsButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    // Position menu below the button using global coordinates for portal
    const globalX = rect.left;
    const globalY = rect.bottom + 2;
    
    setContextMenuPosition({ x: globalX, y: globalY });
    setContextMenuOpen(true);
  };

  const handleMenuClose = () => {
    setContextMenuOpen(false);
  };

  // Create context menu items
  const contextMenuItems = [
    {
      type: 'item' as const,
      text: localStatus.bookmarked ? 'Unbookmark' : 'Bookmark',
      onClick: async () => {
        console.log('🔖 Bookmark menu item clicked!');
        console.log('🔖 onBookmarkClick function:', onBookmarkClick);
        console.log('🔖 isBookmarking:', isBookmarking);
        console.log('🔖 localStatus.bookmarked:', localStatus.bookmarked);
        console.log('🔖 localStatus.id:', localStatus.id);
        
        if (!onBookmarkClick || isBookmarking) {
          console.log('🔖 Bookmark action blocked - no function or already processing');
          return;
        }
        
        setIsBookmarking(true);
        console.log('🔖 Starting bookmark API call...');
        
        try {
          const result = await onBookmarkClick(localStatus.id, localStatus.bookmarked);
          console.log('🔖 Bookmark API result:', result);
          
          const updatedStatus = {
            ...localStatus,
            bookmarked: result.bookmarked
          };
          
          setLocalStatus(updatedStatus);
          console.log('🔖 Updated local status:', updatedStatus);
          
          // Update all instances of this post across windows
          updatePostEngagementCounts([updatedStatus], 'PostComponent');
        } catch (error) {
          console.error('🔖 Error toggling bookmark:', error);
        } finally {
          setIsBookmarking(false);
          console.log('🔖 Bookmark processing complete');
        }
        
        // Close menu after action
        setContextMenuOpen(false);
        console.log('🔖 Menu closed');
      },
      disabled: isBookmarking
    },
    {
      type: 'item' as const,
      text: 'Raw',
      onClick: async () => {
        if (!snap.accessToken || !snap.serverUrl) {
          console.error('❌ Not authenticated');
          return;
        }

        if (!onRawPostClick) {
          console.error('❌ No raw post click handler provided');
          return;
        }

        try {
          console.log('📄 Fetching raw post data for:', localStatus.id);
          const response = await fetch(`${snap.serverUrl}/api/v1/statuses/${localStatus.id}`, {
            headers: {
              'Authorization': `Bearer ${snap.accessToken}`
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch post data: ${response.status}`);
          }

          const jsonData = await response.json();
          console.log('📄 Raw post data fetched:', jsonData);
          
          onRawPostClick(localStatus.id, jsonData);
        } catch (error) {
          console.error('📄 Error fetching raw post data:', error);
        }
        
        // Close menu after action
        setContextMenuOpen(false);
      },
      disabled: false
    }
  ];

  // If this is a boost/reblog, show the boost info and the original post
  if (status.reblog) {
    return (
      <div
        ref={postRef}
        data-post-id={localStatus.id}
        style={{
          padding: '8px',
          border: '1px solid #808080',
          backgroundColor: '#ffffff',
          marginBottom: '8px',
          fontFamily: 'MS Sans Serif, sans-serif',
          fontSize: '12px',
          overflow: 'hidden',
          wordWrap: 'break-word',
          position: 'relative'
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
              textDecoration: onUserClick ? 'underline' : 'none',
              color: onUserClick ? 'var(--win98-help-green)' : 'inherit'
            }}
            onClick={() => onUserClick && onUserClick(status.account.id)}
          >
            {processedReblogDisplayName}
          </strong> 
          <span style={{ flexShrink: 0 }}>boosted</span>
        </div>
        
        {/* Original post */}
        <PostComponent status={status.reblog} onImageClick={onImageClick} onVideoClick={onVideoClick} onAudioClick={onAudioClick} onYouTubeClick={onYouTubeClick} onConversationClick={onConversationClick} onUserClick={onUserClick} onReplyClick={onReplyClick} onEmojiPickerClick={onEmojiPickerClick} onFavoriteClick={onFavoriteClick} onReblogClick={onReblogClick} onEmojiReactClick={onEmojiReactClick} onBookmarkClick={onBookmarkClick} onRawPostClick={onRawPostClick} />
      </div>
    );
  }

  // Regular post
  return (
    <>
      <div
        ref={postRef}
        data-post-id={localStatus.id}
        style={{
          padding: '8px',
          border: '1px solid #808080',
          backgroundColor: '#ffffff',
          marginBottom: '8px',
          fontFamily: 'MS Sans Serif, sans-serif',
          fontSize: '12px',
          overflow: 'hidden',
          wordWrap: 'break-word',
          position: 'relative'
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
                textDecoration: onUserClick ? 'underline' : 'none',
                color: onUserClick ? 'var(--win98-help-green)' : 'inherit'
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
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => onAudioClick && onAudioClick(media.url, media.description)}
                >
                  <img 
                    src="/volume_sheet-0.png" 
                    alt="Audio attachment" 
                    style={{
                      width: '48px',
                      height: '48px',
                      opacity: 0.7
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Interaction stats */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '11px',
        color: '#808080',
        borderTop: '1px solid #e0e0e0',
        paddingTop: '6px',
        overflow: 'visible'
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
            color: localStatus.reblogged ? 'var(--win98-help-green)' : '#808080',
            fontWeight: localStatus.reblogged ? 'bold' : 'normal',
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
            color: localStatus.favourited ? 'var(--win98-help-green)' : '#808080',
            fontWeight: localStatus.favourited ? 'bold' : 'normal',
            cursor: onFavoriteClick ? 'pointer' : 'default',
            opacity: isFavoriting ? 0.5 : 1
          }}
          onClick={handleFavoriteClick}
        >
          ⭐ {formatNumber(localStatus.favourites_count)}
        </span>

        {/* Button Group */}
        <div style={{ 
          display: 'inline-flex', 
          marginLeft: '8px',
          gap: '2px',
          position: 'relative'
        }}>
          {/* Post Actions Button */}
          <button
            onClick={handlePostActionsButtonClick}
            title="Post Actions"
            style={{
              margin: '0',
              padding: '2px 4px',
              fontSize: '10px',
              border: '2px outset #c0c0c0',
              backgroundColor: '#c0c0c0',
              cursor: 'pointer',
              fontFamily: 'MS Sans Serif, sans-serif',
              minWidth: 'auto',
              width: 'auto',
              lineHeight: '1',
              verticalAlign: 'middle',
              filter: 'none',
              color: 'inherit'
            }}
            onMouseDown={(e) => e.currentTarget.style.border = '2px inset #c0c0c0'}
            onMouseUp={(e) => e.currentTarget.style.border = '2px outset #c0c0c0'}
            onMouseLeave={(e) => e.currentTarget.style.border = '2px outset #c0c0c0'}
          >
            📑
          </button>
          
          {/* Emoji React Picker Button */}
          {onEmojiPickerClick && (
            <button
              onClick={() => onEmojiPickerClick(localStatus.id)}
              title="Add emoji reaction"
              style={{
                margin: '0',
                padding: '2px 4px',
                fontSize: '10px',
                border: '2px outset #c0c0c0',
                backgroundColor: '#c0c0c0',
                cursor: 'pointer',
                fontFamily: 'MS Sans Serif, sans-serif',
                minWidth: 'auto',
                width: 'auto',
                lineHeight: '1',
                verticalAlign: 'middle'
              }}
              onMouseDown={(e) => e.currentTarget.style.border = '2px inset #c0c0c0'}
              onMouseUp={(e) => e.currentTarget.style.border = '2px outset #c0c0c0'}
              onMouseLeave={(e) => e.currentTarget.style.border = '2px outset #c0c0c0'}
            >
              ⁂
            </button>
          )}
        </div>
        
        {/* Emoji Reactions */}
        {(() => {
          const reactions = getEmojiReactions(localStatus);
          return reactions.length > 0;
        })() && (
          <>
            {getEmojiReactions(localStatus).map((reaction) => {
              const opacity = reactingEmoji === reaction.name ? 0.5 : 1;
              return (
                <span
                  key={reaction.name}
                  data-emoji-reaction={reaction.name}
                  style={{
                    cursor: onEmojiReactClick ? 'pointer' : 'default',
                    color: reaction.me ? 'var(--win98-help-green)' : '#808080',
                    fontWeight: reaction.me ? 'bold' : 'normal',
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
      
      {/* Portal for post actions menu */}
      {contextMenuOpen && createPortal(
        <DesktopMenu
          position={contextMenuPosition}
          items={contextMenuItems}
          onClose={handleMenuClose}
          zIndex={10000}
        />,
        document.body
      )}
    </>
  );
};

export default React.memo(PostComponent);
