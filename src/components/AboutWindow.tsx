import React from 'react';
import { DesktopWindow } from 'wtkrjs';

interface AboutWindowProps {
  id: string;
  onClose: () => void;
  onFocus: () => void;
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

const AboutWindow: React.FC<AboutWindowProps> = ({
  id,
  onClose,
  onFocus,
  isFocused,
  isMinimized,
  isMaximized,
  zIndex
}) => {
  return (
    <DesktopWindow
      id={id}
      title="About Bleromo"
      initialPosition={{ x: 200, y: 150 }}
      initialSize={{ width: 350, height: 250 }}
      isFocused={isFocused}
      isMinimized={isMinimized}
      isMaximized={isMaximized}
      zIndex={zIndex}
      isMinimizable={false}
      isMaximizable={false}
      isClosable={true}
      isResizable={false}
      onClose={onClose}
      onFocus={onFocus}
    >
      <div style={{
        height: '100%',
        backgroundColor: '#c0c0c0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--win98-font)',
        textAlign: 'center'
      }}>
        <img 
          src="/pleroma-logo.svg" 
          alt="Bleromo Logo" 
          style={{
            width: '64px',
            height: '64px',
            marginBottom: '16px'
          }}
        />
        
        <div style={{
          fontSize: '24px',
          fontWeight: 'normal',
          marginBottom: '8px',
          letterSpacing: '1px'
        }}>
          bleromo
        </div>
        
        <div style={{
          fontSize: '12px',
          color: '#000000',
          marginBottom: '16px'
        }}>
          for workgroups
        </div>
        
        <div style={{
          fontSize: '10px',
          color: '#808080',
          lineHeight: '1.4',
          textAlign: 'center'
        }}>
          copyright moon.eth 1997<br />
          <br />
          Licensed under AGPL3<br />
          <a 
            href="https://git.shipoclu.com/moon/bleromofw" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#000080',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            Source Code
          </a>
        </div>
      </div>
    </DesktopWindow>
  );
};

export default AboutWindow;