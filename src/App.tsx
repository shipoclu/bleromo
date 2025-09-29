import React, { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { TaskBar, useWindowManager } from 'wtkrjs';
import { appState, loadStoredAuth, logout } from './store/appState';
import LoginWindow from './components/LoginWindow';
import UserProfileWindow from './components/UserProfileWindow';

const App: React.FC = () => {
  const snap = useSnapshot(appState);
  const {
    windows,
    focusWindow,
    minimizeWindow,
    restoreWindow,
    addWindow,
    removeWindow,
    maximizeWindow,
    moveWindow,
    resizeWindow,
  } = useWindowManager();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const handleWindowSelect = (windowId: string) => {
    const window = windows.find((win: any) => win.id === windowId);
    if (window) {
      if (window.isMinimized) {
        restoreWindow({ id: windowId });
      }
      focusWindow({ id: windowId });
    }
  };

  const openUserProfile = () => {
    const profileWindowId = 'user-profile';
    const existingWindow = windows.find((win: any) => win.id === profileWindowId);
    
    if (existingWindow) {
      if (existingWindow.isMinimized) {
        restoreWindow({ id: profileWindowId });
      }
      focusWindow({ id: profileWindowId });
    } else {
      addWindow({
        id: profileWindowId,
        title: 'User Profile',
        icon: <UserIcon />
      });
    }
  };

  const LogoutIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M6,2 L6,6 L2,6 L7,11 L12,6 L8,6 L8,2 Z" fill="currentColor" />
    </svg>
  );

  const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M2,14 Q8,10 14,14" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );

  const StartIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <rect x="2" y="2" width="16" height="16" fill="#008080" stroke="#004040" strokeWidth="1" />
      <path d="M4,4 L16,4 L16,16 L4,16 Z" fill="#00A0A0" />
      <rect x="6" y="6" width="8" height="8" fill="#FFFF00" />
    </svg>
  );

  const startMenuItems = snap.isLoggedIn ? [
    {
      type: 'item' as const,
      text: snap.userData?.display_name || snap.userHandle || 'Unknown User',
      icon: <UserIcon />,
      onClick: openUserProfile
    },
    {
      type: 'separator' as const
    },
    {
      type: 'item' as const,
      text: 'Timeline',
      onClick: () => {
        console.log('Timeline clicked - feature coming soon');
      }
    },
    {
      type: 'item' as const,
      text: 'Notifications',
      onClick: () => {
        console.log('Notifications clicked - feature coming soon');
      }
    },
    {
      type: 'item' as const,
      text: 'Compose',
      onClick: () => {
        console.log('Compose clicked - feature coming soon');
      }
    },
    {
      type: 'separator' as const
    },
    {
      type: 'item' as const,
      text: 'Logout',
      icon: <LogoutIcon />,
      onClick: () => {
        logout();
      }
    }
  ] : [];

  if (!snap.isLoggedIn) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        backgroundColor: 'lightblue',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <LoginWindow />
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      backgroundColor: 'lightblue',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {windows.map((win: any) => {
        if (win.id === 'user-profile') {
          return (
            <UserProfileWindow
              key={win.id}
              id={win.id}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onClose={() => removeWindow({ id: win.id })}
              onFocus={() => focusWindow({ id: win.id })}
              onMinimize={() => minimizeWindow({ id: win.id })}
              onMaximize={() => maximizeWindow({ id: win.id })}
              onRestore={() => restoreWindow({ id: win.id })}
              onMove={() => moveWindow({ id: win.id })}
              onResize={() => resizeWindow({ id: win.id })}
            />
          );
        }
        return null;
      })}
      
      <div style={{ marginTop: 'auto' }}>
        <TaskBar
          windows={windows.map((win: any) => ({
            id: win.id,
            title: win.title,
            isFocused: win.isFocused,
            isMinimized: win.isMinimized,
            icon: win.icon
          }))}
          startMenuItems={startMenuItems}
          startIcon={<StartIcon />}
          onWindowSelect={handleWindowSelect}
          onWindowMinimize={(windowId: string) => minimizeWindow({ id: windowId })}
        />
      </div>
    </div>
  );
};

export default App;
