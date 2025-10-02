import React from 'react';
import { DesktopWindow } from 'wtkrjs';

interface RawPostWindowProps {
  id: string;
  postId: string;
  jsonData: any;
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

const RawPostWindow: React.FC<RawPostWindowProps> = ({
  id,
  postId,
  jsonData,
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
  const formattedJson = JSON.stringify(jsonData, null, 2);

  return (
    <DesktopWindow
      id={id}
      title={`Raw Post ${postId}`}
      initialPosition={{ x: 150, y: 100 }}
      initialSize={{ width: 600, height: 500 }}
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
        {/* Content area */}
        <div style={{
          flex: 1,
          padding: '8px',
          backgroundColor: '#ffffff'
        }}>
          <textarea
            value={formattedJson}
            readOnly
            style={{
              width: '100%',
              height: '100%',
              fontFamily: 'Courier New, monospace',
              fontSize: '11px',
              border: '2px inset #c0c0c0',
              padding: '4px',
              backgroundColor: '#ffffff',
              color: '#000000',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>
      </div>
    </DesktopWindow>
  );
};

export default RawPostWindow;