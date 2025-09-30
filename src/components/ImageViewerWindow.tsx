import React, { useState, useEffect } from 'react';
import { DesktopWindow } from 'wtkrjs';

interface ImageViewerWindowProps {
  id: string;
  imageUrl: string;
  imageDescription?: string;
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

const ImageViewerWindow: React.FC<ImageViewerWindowProps> = ({
  id,
  imageUrl,
  imageDescription,
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
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 400, height: 300 });
  const [windowPosition, setWindowPosition] = useState({ x: 100, y: 100 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const calculateWindowSize = (imageWidth: number, imageHeight: number) => {
    // Get screen dimensions with reasonable margins
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const margin = 80; // Margin around the window
    const titleBarHeight = 30; // Approximate titlebar height
    const maxWidth = screenWidth - (margin * 2);
    const maxHeight = screenHeight - (margin * 2) - titleBarHeight;

    // Calculate scaled dimensions maintaining aspect ratio
    let scaledWidth = imageWidth;
    let scaledHeight = imageHeight;

    // Scale down if image is larger than max dimensions
    if (scaledWidth > maxWidth || scaledHeight > maxHeight) {
      const widthRatio = maxWidth / scaledWidth;
      const heightRatio = maxHeight / scaledHeight;
      const scaleRatio = Math.min(widthRatio, heightRatio);
      
      scaledWidth = Math.floor(scaledWidth * scaleRatio);
      scaledHeight = Math.floor(scaledHeight * scaleRatio);
    }

    // Add some padding for the window chrome
    const windowWidth = scaledWidth + 16; // 8px padding on each side
    const windowHeight = scaledHeight + 16; // 8px padding top/bottom

    // Center the window on screen
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = Math.floor((screenHeight - windowHeight) / 2);

    return {
      size: { width: windowWidth, height: windowHeight },
      position: { x, y },
      imageSize: { width: scaledWidth, height: scaledHeight }
    };
  };

  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      const { size, position } = calculateWindowSize(img.naturalWidth, img.naturalHeight);
      setWindowSize(size);
      setWindowPosition(position);
      setIsLoading(false);
    };

    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };

    img.src = imageUrl;
  }, [imageUrl]);

  const getImageTitle = () => {
    return windowNumber > 0 ? `Image Viewer ${windowNumber}` : 'Image Viewer';
  };

  return (
    <DesktopWindow
      id={id}
      title={getImageTitle()}
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
            Loading image...
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
            <div style={{ marginBottom: '8px' }}>Failed to load image</div>
            <div style={{ fontSize: '11px', color: '#808080', wordBreak: 'break-all' }}>
              {imageUrl}
            </div>
          </div>
        )}

        {!isLoading && !hasError && imageDimensions && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img 
              src={imageUrl}
              alt={imageDescription || 'Full size image'}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                border: '1px solid #808080'
              }}
            />
          </div>
        )}

        {/* Image info footer */}
        {!isLoading && !hasError && imageDimensions && (
          <div style={{
            borderTop: '1px solid #808080',
            paddingTop: '4px',
            marginTop: '8px',
            fontSize: '11px',
            color: '#808080',
            textAlign: 'center'
          }}>
            {imageDimensions.width} × {imageDimensions.height} pixels
            {imageDescription && (
              <div style={{ marginTop: '2px', fontStyle: 'italic' }}>
                {imageDescription}
              </div>
            )}
          </div>
        )}
      </div>
    </DesktopWindow>
  );
};

export default ImageViewerWindow;