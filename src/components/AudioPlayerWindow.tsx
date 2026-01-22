import React, { useState, useEffect } from 'react';
import { DesktopWindow, type WindowMoveEvent, type WindowResizeEvent } from 'wtkrjs';

interface AudioPlayerWindowProps {
  id: string;
  audioUrl: string;
  audioDescription?: string;
  windowNumber: number;
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

const AudioPlayerWindow: React.FC<AudioPlayerWindowProps> = ({
  id,
  audioUrl,
  audioDescription: _audioDescription,
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

  // Fixed size for audio player - just big enough for native audio controls
  const windowSize = { width: 400, height: 120 };
  const windowPosition = { x: 160, y: 160 };

  useEffect(() => {
    const audio = document.createElement('audio');
    
    audio.onloadedmetadata = () => {
      setIsLoading(false);
    };

    audio.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };

    audio.src = audioUrl;
  }, [audioUrl]);

  const getAudioTitle = () => {
    return windowNumber > 0 ? `Audio Player ${windowNumber}` : 'Audio Player';
  };

  return (
    <DesktopWindow
      id={id}
      title={getAudioTitle()}
      initialPosition={windowPosition}
      initialSize={windowSize}
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
        padding: '8px',
        fontFamily: 'var(--win98-font)',
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
            Loading audio...
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
            <div style={{ marginBottom: '8px' }}>Failed to load audio</div>
            <div style={{ fontSize: '11px', color: '#808080', wordBreak: 'break-all' }}>
              {audioUrl}
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
            <audio 
              src={audioUrl}
              controls
              style={{
                width: '100%',
                border: '1px solid #808080'
              }}
            />
          </div>
        )}
      </div>
    </DesktopWindow>
  );
};

export default AudioPlayerWindow;