import React, { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { TaskBar, useWindowManager } from 'wtkrjs';
import { appState, loadStoredAuth, logout } from './store/appState';
import LoginWindow from './components/LoginWindow';
import UserProfileWindow from './components/UserProfileWindow';
import PublicTimelineWindow from './components/PublicTimelineWindow';
import LocalTimelineWindow from './components/LocalTimelineWindow';
import ImageViewerWindow from './components/ImageViewerWindow';
import VideoViewerWindow from './components/VideoViewerWindow';

const App: React.FC = () => {
  const snap = useSnapshot(appState);
  const [imageWindowData, setImageWindowData] = useState<Record<string, { imageUrl: string; imageDescription?: string; windowNumber: number }>>({});
  const [imageWindowCounter, setImageWindowCounter] = useState(1);
  const [videoWindowData, setVideoWindowData] = useState<Record<string, { videoUrl: string; videoDescription?: string; windowNumber: number }>>({});
  const [videoWindowCounter, setVideoWindowCounter] = useState(1);
  
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

  const openVideoViewer = (videoUrl: string, description?: string) => {
    console.log('openVideoViewer called with:', videoUrl, description);
    // Create a unique ID based on hash of the video URL
    const createHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16);
    };
    const videoWindowId = `video-${createHash(videoUrl)}`;
    console.log('Video window ID:', videoWindowId);
    const existingWindow = windows.find((win: any) => win.id === videoWindowId);
    
    if (existingWindow) {
      console.log('Existing video window found, focusing');
      // Always ensure video data is stored (in case it was cleaned up but window still exists)
      setVideoWindowData(prev => ({
        ...prev,
        [videoWindowId]: { videoUrl, videoDescription: description, windowNumber: prev[videoWindowId]?.windowNumber || videoWindowCounter }
      }));
      
      if (existingWindow.isMinimized) {
        restoreWindow({ id: videoWindowId });
      }
      focusWindow({ id: videoWindowId });
    } else {
      console.log('Creating new video window');
      // Store video data with new window number
      const windowNumber = videoWindowCounter;
      setVideoWindowData(prev => ({
        ...prev,
        [videoWindowId]: { videoUrl, videoDescription: description, windowNumber }
      }));
      setVideoWindowCounter(prev => prev + 1);
      
      addWindow({
        id: videoWindowId,
        title: `Video Player ${windowNumber}`,
        icon: <VideoIcon />
      });
    }
  };

  const LogoutIcon = () => (
    <img src="/users_key-4.png" alt="Logout" width="16" height="16" />
  );

  const UserIcon = () => (
    <img src="/address_book_user.png" alt="User" width="16" height="16" />
  );

  const TimelineIcon = () => (
    <img src="/directory_closed-0.png" alt="Timeline" width="16" height="16" />
  );

  const LocalTimelineIcon = () => (
    <img src="/directory_closed-0.png" alt="Local Timeline" width="16" height="16" />
  );

  const ImageIcon = () => (
    <img src="/camera3-4.png" alt="Image" width="16" height="16" />
  );

  const VideoIcon = () => (
    <img src="/camera3-4.png" alt="Video" width="16" height="16" />
  );

  const StartIcon = () => (
    <img 
      src="/pleroma-logo.svg" 
      alt="Start" 
      style={{ 
        width: '14px', 
        height: '14px',
        objectFit: 'contain',
        margin: '2px'
      }} 
    />
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
              onVideoClick={openVideoViewer}
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
              onVideoClick={openVideoViewer}
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
        if (win.id.startsWith('video-')) {
          const videoData = videoWindowData[win.id];
          if (!videoData) {
            // Skip rendering if we don't have video data
            return null;
          }
          
          return (
            <VideoViewerWindow
              key={win.id}
              id={win.id}
              videoUrl={videoData.videoUrl}
              videoDescription={videoData.videoDescription}
              windowNumber={videoData.windowNumber}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onClose={() => {
                // Clean up video data when window is closed
                setVideoWindowData(prev => {
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
