import React from 'react';
import { DesktopWindow } from 'wtkrjs';
import LoginForm from './LoginForm';

const LoginWindow: React.FC = () => {
  return (
    <DesktopWindow
      id="login-window"
      title="Bleromofw - Fediverse Login"
      initialPosition={{ x: 300, y: 200 }}
      initialSize={{ width: 400, height: 250 }}
      isFocused={true}
      isMinimized={false}
      isMaximized={false}
      zIndex={9999}
      isMinimizable={false}
      isMaximizable={false}
      isClosable={false}
      isResizable={false}
      onClose={() => {}}
      onFocus={() => {}}
      onMinimize={() => {}}
      onMaximize={() => {}}
      onRestore={() => {}}
      onMove={() => {}}
      onResize={() => {}}
    >
      <div style={{
        padding: '30px',
        textAlign: 'center',
        backgroundColor: '#c0c0c0',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        <LoginForm />
      </div>
    </DesktopWindow>
  );
};

export default LoginWindow;