import React, { useState, useEffect, useCallback } from 'react';
import { DesktopWindow, type WindowMoveEvent, type WindowResizeEvent } from 'wtkrjs';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';
import { useAbortControllers } from '../utils/useAbortControllers';

// Global cache for custom emoji to persist across component instances
const customEmojiCache = new Map<string, CustomEmoji>();
const customEmojiCacheTimestamp = new Map<string, number>();
const customEmojiImageCache = new Map<string, string>(); // Cache for image URLs -> blob URLs
const CACHE_DURATION = 5 * 24 * 60 * 60 * 1000; // 5 days

// Function to preload and cache emoji images
const preloadEmojiImages = async (serverUrl: string, emojiData: CustomEmoji, signal?: AbortSignal) => {
  const imagesToCache: Promise<void>[] = [];
  
  Object.entries(emojiData).forEach(([name, data]) => {
    const imageUrl = `${serverUrl}${data.image_url}`;
    const cacheKey = imageUrl;
    
    // Skip if already cached
    if (customEmojiImageCache.has(cacheKey)) {
      return;
    }
    
    // Create promise to cache this image
    const cachePromise = fetch(imageUrl, {
      method: 'GET',
      cache: 'force-cache', // Aggressive browser caching
      mode: 'cors',
      signal
    })
    .then(response => response.blob())
    .then(blob => {
      const objectUrl = URL.createObjectURL(blob);
      customEmojiImageCache.set(cacheKey, objectUrl);
      console.log(`🖼️ Cached emoji image: ${name}`);
    })
    .catch(error => {
      console.warn(`Failed to cache emoji image ${name}:`, error);
    });
    
    imagesToCache.push(cachePromise);
  });
  
  // Wait for all images to be cached
  if (imagesToCache.length > 0) {
    console.log(`🖼️ Preloading ${imagesToCache.length} emoji images...`);
    await Promise.allSettled(imagesToCache);
    console.log(`🖼️ Finished preloading emoji images`);
  }
};

// Function to clean up expired blob URLs
const cleanupExpiredImageCache = () => {
  // Create a new Map to avoid modifying while iterating
  const keysToDelete: string[] = [];
  
  customEmojiImageCache.forEach((blobUrl, cacheKey) => {
    // For now, we'll only clean up when explicitly requested
    // In the future, we could add timestamp tracking for automatic cleanup
    try {
      // Test if the blob URL is still valid by creating an image
      const img = new Image();
      img.onload = () => img.remove();
      img.onerror = () => {
        keysToDelete.push(cacheKey);
        URL.revokeObjectURL(blobUrl);
      };
      img.src = blobUrl;
    } catch (error) {
      keysToDelete.push(cacheKey);
      URL.revokeObjectURL(blobUrl);
    }
  });
  
  keysToDelete.forEach(key => customEmojiImageCache.delete(key));
  if (keysToDelete.length > 0) {
    console.log(`🗑️ Cleaned up ${keysToDelete.length} expired emoji image cache entries`);
  }
};

interface CustomEmoji {
  [name: string]: {
    tags: string[];
    image_url: string;
  };
}

interface EmojiReactPickerWindowProps {
  id: string;
  statusId: string;
  onClose: () => void;
  onFocus: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onMove: (event: WindowMoveEvent) => void;
  onResize: (event: WindowResizeEvent) => void;
  onEmojiReact: (statusId: string, emojiName: string, currentlyReacted: boolean) => Promise<any>;
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

const EmojiReactPickerWindow: React.FC<EmojiReactPickerWindowProps> = ({
  id,
  statusId,
  onClose,
  onFocus,
  onMinimize,
  onMaximize,
  onRestore,
  onMove,
  onResize,
  onEmojiReact,
  isFocused,
  isMinimized,
  isMaximized,
  zIndex
}) => {
  const snap = useSnapshot(appState);
  const { createController, releaseController, isMountedRef } = useAbortControllers();
  const [activeTab, setActiveTab] = useState<'emoji' | 'custom'>('emoji');
  const [searchText, setSearchText] = useState('');
  const [customEmoji, setCustomEmoji] = useState<CustomEmoji>({});
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);
  const [customEmojiError, setCustomEmojiError] = useState<string | null>(null);

  // Common Unicode emoji grouped by category
  const unicodeEmoji = {
    'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
    'Gestures': ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
    'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
    'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊'],
    'Food': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🍄', '🥔', '🍠', '🥐', '🥖', '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕']
  };

  const fetchCustomEmoji = useCallback(async (forceRefresh = false) => {
    if (!snap.serverUrl) return;

    const cacheKey = snap.serverUrl;
    const cachedData = customEmojiCache.get(cacheKey);
    const cacheTime = customEmojiCacheTimestamp.get(cacheKey);
    const now = Date.now();

    // Check if we have valid cached data and don't need to refresh
    if (!forceRefresh && cachedData && cacheTime && (now - cacheTime) < CACHE_DURATION) {
      console.log('📦 Using cached custom emoji data');
      setCustomEmoji(cachedData);
      setCustomEmojiError(null);
      return;
    }

    const controller = createController();
    if (isMountedRef.current) {
      setIsLoadingCustom(true);
      setCustomEmojiError(null);
    }

    try {
      console.log('🌐 Fetching custom emoji from server:', snap.serverUrl);
      const response = await fetch(`${snap.serverUrl}/api/v1/pleroma/emoji`, {
        headers: snap.accessToken ? {
          'Authorization': `Bearer ${snap.accessToken}`
        } : {},
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch custom emoji: ${response.status}`);
      }

      const emojiData: CustomEmoji = await response.json();
      if (!isMountedRef.current || controller.signal.aborted) return;
      
      // Cache the data
      customEmojiCache.set(cacheKey, emojiData);
      customEmojiCacheTimestamp.set(cacheKey, now);
      console.log(`💾 Cached ${Object.keys(emojiData).length} custom emoji for ${cacheKey}`);
      
      // Preload and cache emoji images
      await preloadEmojiImages(snap.serverUrl, emojiData, controller.signal);
      if (!isMountedRef.current || controller.signal.aborted) return;
      
      setCustomEmoji(emojiData);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Error fetching custom emoji:', err);
      if (isMountedRef.current) {
        setCustomEmojiError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      releaseController(controller);
      if (!controller.signal.aborted && isMountedRef.current) {
        setIsLoadingCustom(false);
      }
    }
  }, [snap.serverUrl, snap.accessToken]);

  useEffect(() => {
    if (activeTab === 'custom') {
      fetchCustomEmoji();
    }
  }, [activeTab, fetchCustomEmoji]);

  const handleEmojiClick = async (emojiName: string) => {
    try {
      const updatedStatus = await onEmojiReact(statusId, emojiName, false);
      
      // Import and call the engagement count update function to refresh all windows
      const { updatePostEngagementCounts } = await import('../utils/postUpdates');
      setTimeout(() => {
        updatePostEngagementCounts([updatedStatus], 'Emoji Picker');
      }, 50);
      
      onClose();
    } catch (error) {
      console.error('Error reacting with emoji:', error);
    }
  };

  const filterEmoji = (emoji: string[], searchTerm: string) => {
    if (!searchTerm) return emoji;
    return emoji.filter(e => e.includes(searchTerm.toLowerCase()));
  };

  const filterCustomEmoji = (customEmojiData: CustomEmoji, searchTerm: string) => {
    if (!searchTerm) return Object.entries(customEmojiData);
    
    return Object.entries(customEmojiData).filter(([name, data]) => {
      const nameMatch = name.toLowerCase().includes(searchTerm.toLowerCase());
      const tagMatch = data.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return nameMatch || tagMatch;
    });
  };

  const renderUnicodeEmojiTab = () => {
    return (
      <div style={{ 
        padding: '8px', 
        maxHeight: '300px', 
        overflowY: 'auto',
        backgroundColor: '#ffffff'
      }}>
        {Object.entries(unicodeEmoji).map(([category, emojis]) => {
          const filteredEmojis = filterEmoji(emojis, searchText);
          if (filteredEmojis.length === 0) return null;

          return (
            <div key={category} style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '11px', 
                fontWeight: 'bold', 
                marginBottom: '4px',
                color: '#808080'
              }}>
                {category}
              </div>
              <div style={{ 
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                justifyContent: 'center',
                alignItems: 'flex-start'
              }}>
                {filteredEmojis.map((emoji, index) => (
                  <a
                    key={`${category}-${index}`}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleEmojiClick(emoji);
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      minWidth: '32px',
                      maxWidth: '32px',
                      minHeight: '32px',
                      maxHeight: '32px',
                      border: '1px solid #808080',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      color: 'inherit',
                      boxSizing: 'border-box',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    {emoji}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCustomEmojiTab = () => {
    if (isLoadingCustom) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          backgroundColor: '#ffffff'
        }}>
          Loading custom emoji...
        </div>
      );
    }

    if (customEmojiError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          backgroundColor: '#ffffff',
          color: '#800000'
        }}>
          Error loading custom emoji: {customEmojiError}
          <div style={{ marginTop: '8px' }}>
            <button 
              onClick={() => fetchCustomEmoji(true)}
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
      );
    }

    const filteredCustomEmoji = filterCustomEmoji(customEmoji, searchText);

    if (filteredCustomEmoji.length === 0) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          backgroundColor: '#ffffff',
          color: '#808080'
        }}>
          {searchText ? 'No custom emoji found matching your search' : 'No custom emoji available'}
        </div>
      );
    }

    return (
      <div style={{ 
        backgroundColor: '#ffffff'
      }}>
        {/* Refresh button */}
        <div style={{
          padding: '6px 8px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '11px', color: '#808080' }}>
            {filteredCustomEmoji.length} custom emoji
          </span>
          <button
            onClick={() => {
              cleanupExpiredImageCache();
              fetchCustomEmoji(true);
            }}
            disabled={isLoadingCustom}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              border: '1px outset #c0c0c0',
              backgroundColor: '#c0c0c0',
              cursor: isLoadingCustom ? 'default' : 'pointer',
              opacity: isLoadingCustom ? 0.6 : 1
            }}
          >
            {isLoadingCustom ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {/* Emoji grid */}
        <div style={{ 
          padding: '8px', 
          maxHeight: '250px', 
          overflowY: 'auto'
        }}>
          <div style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}>
            {filteredCustomEmoji.map(([name, data]) => (
            <button
              key={name}
              onClick={() => handleEmojiClick(name)}
              style={{
                width: '40px',
                height: '40px',
                minWidth: '40px',
                maxWidth: '40px',
                minHeight: '40px',
                maxHeight: '40px',
                border: '1px solid #808080',
                backgroundColor: '#c0c0c0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
              onMouseDown={(e) => e.currentTarget.style.border = '1px inset #808080'}
              onMouseUp={(e) => e.currentTarget.style.border = '1px solid #808080'}
              onMouseLeave={(e) => e.currentTarget.style.border = '1px solid #808080'}
              title={name}
            >
              <img 
                src={(() => {
                  const imageUrl = `${snap.serverUrl}${data.image_url}`;
                  const cachedBlobUrl = customEmojiImageCache.get(imageUrl);
                  return cachedBlobUrl || imageUrl;
                })()}
                alt={name}
                loading="lazy"
                crossOrigin="anonymous"
                style={{
                  width: '28px',
                  height: '28px',
                  objectFit: 'contain'
                }}
              />
            </button>
          ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DesktopWindow
      id={id}
      title="Emoji React"
      initialPosition={{ x: 300, y: 200 }}
      initialSize={{ width: 500, height: 400 }}
      isFocused={isFocused}
      isMinimized={isMinimized}
      isMaximized={isMaximized}
      zIndex={zIndex}
      isMinimizable={true}
      isMaximizable={false}
      isClosable={true}
      isResizable={false}
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
        {/* Search field */}
        <div style={{ 
          padding: '8px',
          borderBottom: '1px solid #808080'
        }}>
          <input
            type="text"
            placeholder="Search emoji..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: '100%',
              padding: '4px',
              border: '2px inset #c0c0c0',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              fontFamily: 'MS Sans Serif, sans-serif'
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex',
          borderBottom: '1px solid #808080'
        }}>
          <button
            onClick={() => setActiveTab('emoji')}
            style={{
              flex: 1,
              padding: '6px 12px',
              border: 'none',
              backgroundColor: activeTab === 'emoji' ? '#c0c0c0' : '#808080',
              color: activeTab === 'emoji' ? '#000000' : '#c0c0c0',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'MS Sans Serif, sans-serif',
              borderTop: activeTab === 'emoji' ? '2px outset #c0c0c0' : '1px solid #808080',
              borderLeft: '1px solid #808080',
              borderRight: '1px solid #404040'
            }}
          >
            Emoji
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            style={{
              flex: 1,
              padding: '6px 12px',
              border: 'none',
              backgroundColor: activeTab === 'custom' ? '#c0c0c0' : '#808080',
              color: activeTab === 'custom' ? '#000000' : '#c0c0c0',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'MS Sans Serif, sans-serif',
              borderTop: activeTab === 'custom' ? '2px outset #c0c0c0' : '1px solid #808080',
              borderLeft: '1px solid #404040',
              borderRight: '1px solid #808080'
            }}
          >
            Custom
          </button>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'emoji' ? renderUnicodeEmojiTab() : renderCustomEmojiTab()}
        </div>
      </div>
    </DesktopWindow>
  );
};

export default EmojiReactPickerWindow;
