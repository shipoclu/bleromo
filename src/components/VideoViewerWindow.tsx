import React, { useState, useEffect } from 'react';
import { DesktopWindow } from 'wtkrjs';

interface VideoViewerWindowProps {
  id: string;
  videoUrl: string;
  videoDescription?: string;
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

const VideoViewerWindow: React.FC<VideoViewerWindowProps> = ({
  id,
  videoUrl,
  videoDescription,
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
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 640, height: 480 });
  const [windowPosition, setWindowPosition] = useState({ x: 120, y: 120 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const calculateWindowSize = (videoWidth: number, videoHeight: number) => {
    // Get screen dimensions with reasonable margins
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const margin = 80; // Margin around the window
    const titleBarHeight = 30; // Approximate titlebar height
    const controlsHeight = 40; // Space for video controls
    const maxWidth = screenWidth - (margin * 2);
    const maxHeight = screenHeight - (margin * 2) - titleBarHeight - controlsHeight;

    // Calculate scaled dimensions maintaining aspect ratio
    let scaledWidth = videoWidth;
    let scaledHeight = videoHeight;

    // Scale down if video is larger than max dimensions
    if (scaledWidth > maxWidth || scaledHeight > maxHeight) {
      const widthRatio = maxWidth / scaledWidth;
      const heightRatio = maxHeight / scaledHeight;
      const scaleRatio = Math.min(widthRatio, heightRatio);
      
      scaledWidth = Math.floor(scaledWidth * scaleRatio);
      scaledHeight = Math.floor(scaledHeight * scaleRatio);
    }

    // Add some padding for the window chrome and controls
    const windowWidth = scaledWidth + 16; // 8px padding on each side
    const windowHeight = scaledHeight + 16 + controlsHeight; // 8px padding + controls

    // Center the window on screen
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = Math.floor((screenHeight - windowHeight) / 2);

    return {
      size: { width: windowWidth, height: windowHeight },
      position: { x, y },
      videoSize: { width: scaledWidth, height: scaledHeight }
    };
  };

  useEffect(() => {
    const video = document.createElement('video');
    
    video.onloadedmetadata = () => {
      setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
      const { size, position } = calculateWindowSize(video.videoWidth, video.videoHeight);
      setWindowSize(size);
      setWindowPosition(position);
      setIsLoading(false);
    };

    video.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };

    video.src = videoUrl;
  }, [videoUrl]);

  const getVideoTitle = () => {
    return windowNumber > 0 ? `Video Player ${windowNumber}` : 'Video Player';
  };

  return (
    <DesktopWindow
      id={id}
      title={getVideoTitle()}
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
            Loading video...
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
            <div style={{ marginBottom: '8px' }}>Failed to load video</div>
            <div style={{ fontSize: '11px', color: '#808080', wordBreak: 'break-all' }}>
              {videoUrl}
            </div>
          </div>
        )}

        {!isLoading && !hasError && videoDimensions && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <video 
              src={videoUrl}
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                border: '1px solid #808080'
              }}
            />
          </div>
        )}
      </div>
    </DesktopWindow>
  );
};

export default VideoViewerWindow;