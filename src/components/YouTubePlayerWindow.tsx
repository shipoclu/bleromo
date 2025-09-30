import React, { useState, useEffect } from 'react';
import { DesktopWindow } from 'wtkrjs';

interface YouTubePlayerWindowProps {
  id: string;
  videoId: string;
  videoUrl: string;
  windowNumber: number;
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

const YouTubePlayerWindow: React.FC<YouTubePlayerWindowProps> = ({
  id,
  videoId,
  videoUrl: _videoUrl,
  windowNumber,
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Standard YouTube embed size (16:9 aspect ratio) with some padding
  const windowSize = { width: 640, height: 400 };
  const windowPosition = { x: 200, y: 200 };

  useEffect(() => {
    // Simulate loading time for embed
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [videoId]);

  const getYouTubeTitle = () => {
    return windowNumber > 0 ? `YouTube Player ${windowNumber}` : 'YouTube Player';
  };

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`;

  return (
    <DesktopWindow
      id={id}
      title={getYouTubeTitle()}
      initialPosition={windowPosition}
      initialSize={windowSize}
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
        padding: '8px',
        fontFamily: 'MS Sans Serif, sans-serif',
        fontSize: '12px'
      }}>
        {isLoading && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#808080'
          }}>
            Loading YouTube video...
          </div>
        )}

        {hasError && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#800000',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '8px' }}>Failed to load YouTube video</div>
            <div style={{ fontSize: '11px', color: '#808080', wordBreak: 'break-all' }}>
              Video ID: {videoId}
            </div>
          </div>
        )}

        {!isLoading && !hasError && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <iframe
              src={embedUrl}
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid #808080',
                backgroundColor: '#000000'
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setHasError(true);
                setIsLoading(false);
              }}
            />
          </div>
        )}
      </div>
    </DesktopWindow>
  );
};

export default YouTubePlayerWindow;