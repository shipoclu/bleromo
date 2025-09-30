import React, { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { TaskBar, useWindowManager } from 'wtkrjs';
import { appState, loadStoredAuth, logout } from './store/appState';
import LoginWindow from './components/LoginWindow';
import UserProfileWindow from './components/UserProfileWindow';
import PublicTimelineWindow from './components/PublicTimelineWindow';
import LocalTimelineWindow from './components/LocalTimelineWindow';
import ImageViewerWindow from './components/ImageViewerWindow';

const App: React.FC = () => {
  const snap = useSnapshot(appState);
  const [imageWindowData, setImageWindowData] = useState<Record<string, { imageUrl: string; imageDescription?: string; windowNumber: number }>>({});
  const [imageWindowCounter, setImageWindowCounter] = useState(1);
  
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

  // No automatic cleanup - let manual close handle everything

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

  const openPublicTimeline = () => {
    const timelineWindowId = 'public-timeline';
    const existingWindow = windows.find((win: any) => win.id === timelineWindowId);
    
    if (existingWindow) {
      if (existingWindow.isMinimized) {
        restoreWindow({ id: timelineWindowId });
      }
      focusWindow({ id: timelineWindowId });
    } else {
      addWindow({
        id: timelineWindowId,
        title: 'Public Timeline',
        icon: <TimelineIcon />
      });
    }
  };

  const openLocalTimeline = () => {
    const timelineWindowId = 'local-timeline';
    const existingWindow = windows.find((win: any) => win.id === timelineWindowId);
    
    if (existingWindow) {
      if (existingWindow.isMinimized) {
        restoreWindow({ id: timelineWindowId });
      }
      focusWindow({ id: timelineWindowId });
    } else {
      addWindow({
        id: timelineWindowId,
        title: 'Local Timeline',
        icon: <LocalTimelineIcon />
      });
    }
  };

  const openImageViewer = (imageUrl: string, description?: string) => {
    // Create a unique ID based on MD5 hash of the image URL
    const createHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16);
    };
    const imageWindowId = `image-${createHash(imageUrl)}`;
    const existingWindow = windows.find((win: any) => win.id === imageWindowId);
    
    if (existingWindow) {
      // Always ensure image data is stored (in case it was cleaned up but window still exists)
      setImageWindowData(prev => ({
        ...prev,
        [imageWindowId]: { imageUrl, imageDescription: description, windowNumber: prev[imageWindowId]?.windowNumber || imageWindowCounter }
      }));
      
      if (existingWindow.isMinimized) {
        restoreWindow({ id: imageWindowId });
      }
      focusWindow({ id: imageWindowId });
    } else {
      // Store image data with new window number
      const windowNumber = imageWindowCounter;
      setImageWindowData(prev => ({
        ...prev,
        [imageWindowId]: { imageUrl, imageDescription: description, windowNumber }
      }));
      setImageWindowCounter(prev => prev + 1);
      
      addWindow({
        id: imageWindowId,
        title: `Image Viewer ${windowNumber}`,
        icon: <ImageIcon />
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

  const TimelineIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <rect x="2" y="2" width="12" height="2" fill="currentColor" />
      <rect x="2" y="6" width="12" height="2" fill="currentColor" />
      <rect x="2" y="10" width="12" height="2" fill="currentColor" />
      <rect x="2" y="14" width="12" height="2" fill="currentColor" />
    </svg>
  );

  const LocalTimelineIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <rect x="2" y="2" width="12" height="2" fill="currentColor" />
      <rect x="2" y="6" width="8" height="2" fill="currentColor" />
      <rect x="2" y="10" width="10" height="2" fill="currentColor" />
      <rect x="2" y="14" width="6" height="2" fill="currentColor" />
      <circle cx="13" cy="7" r="2" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );

  const ImageIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="6" cy="6" r="1.5" fill="currentColor" />
      <path d="M2,12 L5,9 L7,11 L11,7 L14,10 L14,14 L2,14 Z" fill="currentColor" />
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
      text: 'Public Timeline',
      icon: <TimelineIcon />,
      onClick: openPublicTimeline
    },
    {
      type: 'item' as const,
      text: 'Local Timeline',
      icon: <LocalTimelineIcon />,
      onClick: openLocalTimeline
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
              onClose={() => removeWindow(win.id)}
              onFocus={() => focusWindow({ id: win.id })}
              onMinimize={() => minimizeWindow({ id: win.id })}
              onMaximize={() => maximizeWindow({ id: win.id })}
              onRestore={() => restoreWindow({ id: win.id })}
              onMove={() => moveWindow({ id: win.id })}
              onResize={() => resizeWindow({ id: win.id })}
            />
          );
        }
        if (win.id === 'public-timeline') {
          return (
            <PublicTimelineWindow
              key={win.id}
              id={win.id}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onImageClick={openImageViewer}
              onClose={() => removeWindow(win.id)}
              onFocus={() => focusWindow({ id: win.id })}
              onMinimize={() => minimizeWindow({ id: win.id })}
              onMaximize={() => maximizeWindow({ id: win.id })}
              onRestore={() => restoreWindow({ id: win.id })}
              onMove={() => moveWindow({ id: win.id })}
              onResize={() => resizeWindow({ id: win.id })}
            />
          );
        }
        if (win.id === 'local-timeline') {
          return (
            <LocalTimelineWindow
              key={win.id}
              id={win.id}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onImageClick={openImageViewer}
              onClose={() => removeWindow(win.id)}
              onFocus={() => focusWindow({ id: win.id })}
              onMinimize={() => minimizeWindow({ id: win.id })}
              onMaximize={() => maximizeWindow({ id: win.id })}
              onRestore={() => restoreWindow({ id: win.id })}
              onMove={() => moveWindow({ id: win.id })}
              onResize={() => resizeWindow({ id: win.id })}
            />
          );
        }
        if (win.id.startsWith('image-')) {
          const imageData = imageWindowData[win.id];
          if (!imageData) {
            // Skip rendering if we don't have image data
            return null;
          }
          
          return (
            <ImageViewerWindow
              key={win.id}
              id={win.id}
              imageUrl={imageData.imageUrl}
              imageDescription={imageData.imageDescription}
              windowNumber={imageData.windowNumber}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onClose={() => {
                // Clean up image data when window is closed
                setImageWindowData(prev => {
                  const { [win.id]: removed, ...rest } = prev;
                  return rest;
                });
                // Remove window from window manager
                removeWindow(win.id);
              }}
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
