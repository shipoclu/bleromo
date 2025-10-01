import React, { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { TaskBar, DesktopMenu, useWindowManager, type Position } from 'wtkrjs';
import { appState, loadStoredAuth, logout } from './store/appState';
import LoginWindow from './components/LoginWindow';
import UserProfileWindow from './components/UserProfileWindow';
import PublicTimelineWindow from './components/PublicTimelineWindow';
import LocalTimelineWindow from './components/LocalTimelineWindow';
import HomeTimelineWindow from './components/HomeTimelineWindow';
import NotificationsWindow from './components/NotificationsWindow';
import ConversationWindow from './components/ConversationWindow';
import ImageViewerWindow from './components/ImageViewerWindow';
import VideoViewerWindow from './components/VideoViewerWindow';
import AudioPlayerWindow from './components/AudioPlayerWindow';
import YouTubePlayerWindow from './components/YouTubePlayerWindow';
import EmojiReactPickerWindow from './components/EmojiReactPickerWindow';
import OtherUserProfileWindow from './components/OtherUserProfileWindow';
import UserPostsTimelineWindow from './components/UserPostsTimelineWindow';
import PostCompositionWindow from './components/PostCompositionWindow';
import AboutWindow from './components/AboutWindow';
import FollowersWindow from './components/FollowersWindow';
import FollowingWindow from './components/FollowingWindow';

const App: React.FC = () => {
  const snap = useSnapshot(appState);
  const [startMenuOpen, setStartMenuOpen] = useState<boolean>(false);
  const [startMenuPosition, setStartMenuPosition] = useState<Position>({ x: 0, y: 0 });
  const [imageWindowData, setImageWindowData] = useState<Record<string, { imageUrl: string; imageDescription?: string; windowNumber: number }>>({});
  const [imageWindowCounter, setImageWindowCounter] = useState(1);
  const [videoWindowData, setVideoWindowData] = useState<Record<string, { videoUrl: string; videoDescription?: string; windowNumber: number }>>({});
  const [videoWindowCounter, setVideoWindowCounter] = useState(1);
  const [audioWindowData, setAudioWindowData] = useState<Record<string, { audioUrl: string; audioDescription?: string; windowNumber: number }>>({});
  const [audioWindowCounter, setAudioWindowCounter] = useState(1);
  const [youtubeWindowData, setYoutubeWindowData] = useState<Record<string, { videoId: string; videoUrl: string; windowNumber: number }>>({});
  const [youtubeWindowCounter, setYoutubeWindowCounter] = useState(1);
  const [conversationWindowData, setConversationWindowData] = useState<Record<string, { statusId: string; windowNumber: number }>>({});
  const [conversationWindowCounter, setConversationWindowCounter] = useState(1);
  const [userProfileWindowData, setUserProfileWindowData] = useState<Record<string, { userId: string; windowNumber: number }>>({});
  const [userProfileWindowCounter, setUserProfileWindowCounter] = useState(1);
  const [userPostsTimelineWindowData, setUserPostsTimelineWindowData] = useState<Record<string, { userId: string; userAcct: string; windowNumber: number }>>({});
  const [userPostsTimelineWindowCounter, setUserPostsTimelineWindowCounter] = useState(1);
  const [composeWindowData, setComposeWindowData] = useState<Record<string, { replyToStatusId?: string; mentionHandles?: string[]; windowNumber: number }>>({});
  const [composeWindowCounter, setComposeWindowCounter] = useState(1);
  const [followersWindowData, setFollowersWindowData] = useState<Record<string, { userId: string; userDisplayName?: string; totalCount?: number; windowNumber: number }>>({});
  const [followersWindowCounter, setFollowersWindowCounter] = useState(1);
  const [followingWindowData, setFollowingWindowData] = useState<Record<string, { userId: string; userDisplayName?: string; totalCount?: number; windowNumber: number }>>({});
  const [followingWindowCounter, setFollowingWindowCounter] = useState(1);
  const [emojiPickerStatusId, setEmojiPickerStatusId] = useState<string | null>(null);
  
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

  const openOwnUserProfile = () => {
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

  const openUserProfile = (userId: string) => {
    const userProfileWindowId = `user-profile-${userId}`;
    const existingWindow = windows.find((win: any) => win.id === userProfileWindowId);
    
    if (existingWindow) {
      // Always ensure user profile data is stored
      setUserProfileWindowData(prev => ({
        ...prev,
        [userProfileWindowId]: { userId, windowNumber: prev[userProfileWindowId]?.windowNumber || userProfileWindowCounter }
      }));
      
      if (existingWindow.isMinimized) {
        restoreWindow({ id: userProfileWindowId });
      }
      focusWindow({ id: userProfileWindowId });
    } else {
      // Store user profile data with new window number
      const windowNumber = userProfileWindowCounter;
      setUserProfileWindowData(prev => ({
        ...prev,
        [userProfileWindowId]: { userId, windowNumber }
      }));
      setUserProfileWindowCounter(prev => prev + 1);
      
      addWindow({
        id: userProfileWindowId,
        title: `User Profile ${windowNumber}`,
        icon: <UserIcon />
      });
    }
  };

  const openUserPostsTimeline = (userId: string, userAcct: string) => {
    // Create a unique ID based on hash of the userAcct + " posts"
    const createHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16);
    };
    const userPostsTimelineWindowId = `user-posts-${createHash(userAcct + ' posts')}`;
    const existingWindow = windows.find((win: any) => win.id === userPostsTimelineWindowId);
    
    if (existingWindow) {
      // Always ensure user posts timeline data is stored
      setUserPostsTimelineWindowData(prev => ({
        ...prev,
        [userPostsTimelineWindowId]: { userId, userAcct, windowNumber: prev[userPostsTimelineWindowId]?.windowNumber || userPostsTimelineWindowCounter }
      }));
      
      if (existingWindow.isMinimized) {
        restoreWindow({ id: userPostsTimelineWindowId });
      }
      focusWindow({ id: userPostsTimelineWindowId });
    } else {
      // Store user posts timeline data with new window number
      const windowNumber = userPostsTimelineWindowCounter;
      setUserPostsTimelineWindowData(prev => ({
        ...prev,
        [userPostsTimelineWindowId]: { userId, userAcct, windowNumber }
      }));
      setUserPostsTimelineWindowCounter(prev => prev + 1);
      
      // Create title for window (truncated if too long)
      let title = `@${userAcct} posts`;
      if (title.length > 20) {
        title = title.substring(0, 17) + '...';
      }
      
      addWindow({
        id: userPostsTimelineWindowId,
        title: title,
        icon: <TimelineIcon />
      });
    }
  };

  const openComposeWindow = (replyToStatusId?: string, mentionHandles?: string[]) => {
    // Create a unique ID based on reply status or use a generic compose ID
    const composeWindowId = replyToStatusId ? `compose-reply-${replyToStatusId}` : 'compose-new';
    const existingWindow = windows.find((win: any) => win.id === composeWindowId);
    
    if (existingWindow) {
      // Always ensure compose data is stored
      setComposeWindowData(prev => ({
        ...prev,
        [composeWindowId]: { replyToStatusId, mentionHandles, windowNumber: prev[composeWindowId]?.windowNumber || composeWindowCounter }
      }));
      
      if (existingWindow.isMinimized) {
        restoreWindow({ id: composeWindowId });
      }
      focusWindow({ id: composeWindowId });
    } else {
      // Store compose data with new window number
      const windowNumber = composeWindowCounter;
      setComposeWindowData(prev => ({
        ...prev,
        [composeWindowId]: { replyToStatusId, mentionHandles, windowNumber }
      }));
      setComposeWindowCounter(prev => prev + 1);
      
      // Create title for window
      const title = replyToStatusId ? 'Reply to Post' : 'Compose Post';
      
      addWindow({
        id: composeWindowId,
        title: title,
        icon: <ComposeIcon />
      });
    }
  };

  const openFollowersWindow = (userId: string, userDisplayName?: string, totalCount?: number) => {
    const followersWindowId = `followers-${userId}`;
    const existingWindow = windows.find((win: any) => win.id === followersWindowId);
    
    if (existingWindow) {
      // Always ensure followers data is stored
      setFollowersWindowData(prev => ({
        ...prev,
        [followersWindowId]: { userId, userDisplayName, totalCount, windowNumber: prev[followersWindowId]?.windowNumber || followersWindowCounter }
      }));
      
      if (existingWindow.isMinimized) {
        restoreWindow({ id: followersWindowId });
      }
      focusWindow({ id: followersWindowId });
    } else {
      // Store followers data with new window number
      const windowNumber = followersWindowCounter;
      setFollowersWindowData(prev => ({
        ...prev,
        [followersWindowId]: { userId, userDisplayName, totalCount, windowNumber }
      }));
      setFollowersWindowCounter(prev => prev + 1);
      
      addWindow({
        id: followersWindowId,
        title: `Followers ${windowNumber}`,
        icon: <UserIcon />
      });
    }
  };

  const openFollowingWindow = (userId: string, userDisplayName?: string, totalCount?: number) => {
    const followingWindowId = `following-${userId}`;
    const existingWindow = windows.find((win: any) => win.id === followingWindowId);
    
    if (existingWindow) {
      // Always ensure following data is stored
      setFollowingWindowData(prev => ({
        ...prev,
        [followingWindowId]: { userId, userDisplayName, totalCount, windowNumber: prev[followingWindowId]?.windowNumber || followingWindowCounter }
      }));
      
      if (existingWindow.isMinimized) {
        restoreWindow({ id: followingWindowId });
      }
      focusWindow({ id: followingWindowId });
    } else {
      // Store following data with new window number
      const windowNumber = followingWindowCounter;
      setFollowingWindowData(prev => ({
        ...prev,
        [followingWindowId]: { userId, userDisplayName, totalCount, windowNumber }
      }));
      setFollowingWindowCounter(prev => prev + 1);
      
      addWindow({
        id: followingWindowId,
        title: `Following ${windowNumber}`,
        icon: <UserIcon />
      });
    }
  };

  const openAbout = () => {
    const aboutWindowId = 'about';
    const existingWindow = windows.find((win: any) => win.id === aboutWindowId);
    
    if (existingWindow) {
      if (existingWindow.isMinimized) {
        restoreWindow({ id: aboutWindowId });
      }
      focusWindow({ id: aboutWindowId });
    } else {
      addWindow({
        id: aboutWindowId,
        title: 'About Bleromo',
        icon: <HelpIcon />
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

  const openHomeTimeline = () => {
    const timelineWindowId = 'home-timeline';
    const existingWindow = windows.find((win: any) => win.id === timelineWindowId);
    
    if (existingWindow) {
      if (existingWindow.isMinimized) {
        restoreWindow({ id: timelineWindowId });
      }
      focusWindow({ id: timelineWindowId });
    } else {
      addWindow({
        id: timelineWindowId,
        title: 'Home Timeline',
        icon: <HomeTimelineIcon />
      });
    }
  };

  const openNotifications = () => {
    const notificationsWindowId = 'notifications';
    const existingWindow = windows.find((win: any) => win.id === notificationsWindowId);
    
    if (existingWindow) {
      if (existingWindow.isMinimized) {
        restoreWindow({ id: notificationsWindowId });
      }
      focusWindow({ id: notificationsWindowId });
    } else {
      addWindow({
        id: notificationsWindowId,
        title: 'Notifications',
        icon: <NotificationIcon />
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

  const openAudioPlayer = (audioUrl: string, description?: string) => {
    console.log('openAudioPlayer called with:', audioUrl, description);
    // Create a unique ID based on hash of the audio URL
    const createHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16);
    };
    const audioWindowId = `audio-${createHash(audioUrl)}`;
    console.log('Audio window ID:', audioWindowId);
    const existingWindow = windows.find((win: any) => win.id === audioWindowId);
    
    if (existingWindow) {
      console.log('Existing audio window found, focusing');
      // Always ensure audio data is stored (in case it was cleaned up but window still exists)
      setAudioWindowData(prev => ({
        ...prev,
        [audioWindowId]: { audioUrl, audioDescription: description, windowNumber: prev[audioWindowId]?.windowNumber || audioWindowCounter }
      }));
      
      if (existingWindow.isMinimized) {
        restoreWindow({ id: audioWindowId });
      }
      focusWindow({ id: audioWindowId });
    } else {
      console.log('Creating new audio window');
      // Store audio data with new window number
      const windowNumber = audioWindowCounter;
      setAudioWindowData(prev => ({
        ...prev,
        [audioWindowId]: { audioUrl, audioDescription: description, windowNumber }
      }));
      setAudioWindowCounter(prev => prev + 1);
      
      addWindow({
        id: audioWindowId,
        title: `Audio Player ${windowNumber}`,
        icon: <AudioIcon />
      });
    }
  };

  const openYouTubePlayer = (videoId: string, videoUrl: string) => {
    console.log('openYouTubePlayer called with:', videoId, videoUrl);
    const youtubeWindowId = `youtube-${videoId}`;
    console.log('YouTube window ID:', youtubeWindowId);
    const existingWindow = windows.find((win: any) => win.id === youtubeWindowId);
    
    if (existingWindow) {
      console.log('Existing YouTube window found, focusing');
      // Always ensure YouTube data is stored (in case it was cleaned up but window still exists)
      setYoutubeWindowData(prev => ({
        ...prev,
        [youtubeWindowId]: { videoId, videoUrl, windowNumber: prev[youtubeWindowId]?.windowNumber || youtubeWindowCounter }
      }));
      
      if (existingWindow.isMinimized) {
        restoreWindow({ id: youtubeWindowId });
      }
      focusWindow({ id: youtubeWindowId });
    } else {
      console.log('Creating new YouTube window');
      // Store YouTube data with new window number
      const windowNumber = youtubeWindowCounter;
      setYoutubeWindowData(prev => ({
        ...prev,
        [youtubeWindowId]: { videoId, videoUrl, windowNumber }
      }));
      setYoutubeWindowCounter(prev => prev + 1);
      
      addWindow({
        id: youtubeWindowId,
        title: `YouTube Player ${windowNumber}`,
        icon: <YouTubeIcon />
      });
    }
  };

  const openEmojiPicker = (statusId: string) => {
    const emojiPickerWindowId = 'emoji-picker';
    const existingWindow = windows.find((win: any) => win.id === emojiPickerWindowId);
    
    if (existingWindow) {
      // If window exists but for different status, update the status
      setEmojiPickerStatusId(statusId);
      
      if (existingWindow.isMinimized) {
        restoreWindow({ id: emojiPickerWindowId });
      }
      focusWindow({ id: emojiPickerWindowId });
    } else {
      // Create new emoji picker window
      setEmojiPickerStatusId(statusId);
      
      addWindow({
        id: emojiPickerWindowId,
        title: 'Emoji React',
        icon: <span>❤️</span>
      });
    }
  };

  const handleEmojiReact = async (statusId: string, emojiName: string, currentlyReacted: boolean): Promise<any> => {
    if (!snap.accessToken || !snap.serverUrl) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${snap.serverUrl}/api/v1/pleroma/statuses/${statusId}/reactions/${encodeURIComponent(emojiName)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${snap.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to react with ${emojiName}: ${response.status}`);
    }

    return await response.json();
  };

  const openConversation = (statusId: string) => {
    const conversationWindowId = `conversation-${statusId}`;
    const existingWindow = windows.find((win: any) => win.id === conversationWindowId);
    
    if (existingWindow) {
      // Always ensure conversation data is stored
      setConversationWindowData(prev => ({
        ...prev,
        [conversationWindowId]: { statusId, windowNumber: prev[conversationWindowId]?.windowNumber || conversationWindowCounter }
      }));
      
      if (existingWindow.isMinimized) {
        restoreWindow({ id: conversationWindowId });
      }
      focusWindow({ id: conversationWindowId });
    } else {
      // Store conversation data with new window number
      const windowNumber = conversationWindowCounter;
      setConversationWindowData(prev => ({
        ...prev,
        [conversationWindowId]: { statusId, windowNumber }
      }));
      setConversationWindowCounter(prev => prev + 1);
      
      addWindow({
        id: conversationWindowId,
        title: `Conversation ${windowNumber}`,
        icon: <ConversationIcon />
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
    <img src="/earth.png" alt="Timeline" width="16" height="16" />
  );

  const LocalTimelineIcon = () => (
    <img src="/tree-0.png" alt="Local Timeline" width="16" height="16" />
  );

  const HomeTimelineIcon = () => (
    <img src="/newspaper-letter.png" alt="Home Timeline" width="16" height="16" />
  );

  const ImageIcon = () => (
    <img src="/camera3-4.png" alt="Image" width="16" height="16" />
  );

  const VideoIcon = () => (
    <img src="/camera3-4.png" alt="Video" width="16" height="16" />
  );

  const AudioIcon = () => (
    <img src="/volume_sheet-0.png" alt="Audio" width="16" height="16" />
  );

  const YouTubeIcon = () => (
    <img src="/camera3-4.png" alt="YouTube" width="16" height="16" />
  );

  const NotificationIcon = () => (
    <img src="/file_lines-0.png" alt="Notifications" width="16" height="16" />
  );

  const ConversationIcon = () => (
    <img src="/directory_closed-0.png" alt="Conversation" width="16" height="16" />
  );

  const ComposeIcon = () => (
    <img src="/notepad-1.png" alt="Compose" width="16" height="16" />
  );

  const HelpIcon = () => (
    <img src="/help_question_mark-0.png" alt="Help" width="16" height="16" />
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

  const handleStartMenuOpen = (position: Position) => {
    setStartMenuPosition(position);
    setStartMenuOpen(true);
  };

  const handleStartMenuClose = () => {
    setStartMenuOpen(false);
  };

  const startMenuItems = snap.isLoggedIn ? [
    {
      type: 'item' as const,
      text: snap.userData?.display_name || snap.userHandle || 'Unknown User',
      icon: <UserIcon />,
      onClick: openOwnUserProfile
    },
    {
      type: 'separator' as const
    },
    {
      type: 'submenu' as const,
      text: 'Timelines',
      icon: <ConversationIcon />,
      items: [
        {
          type: 'item' as const,
          text: 'Home Timeline',
          icon: <HomeTimelineIcon />,
          onClick: openHomeTimeline
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
        }
      ]
    },
    {
      type: 'item' as const,
      text: 'Notifications',
      icon: <NotificationIcon />,
      onClick: openNotifications
    },
    {
      type: 'item' as const,
      text: 'Compose',
      icon: <ComposeIcon />,
      onClick: () => openComposeWindow()
    },
    {
      type: 'separator' as const
    },
    {
      type: 'item' as const,
      text: 'About',
      icon: <HelpIcon />,
      onClick: openAbout
    },
    {
      type: 'separator' as const
    },
    {
      type: 'item' as const,
      text: 'Logout',
      icon: <LogoutIcon />,
      onClick: () => {
        // Close all windows before logout
        windows.forEach(window => {
          removeWindow(window.id);
        });
        
        // Clear all window state data
        setImageWindowData({});
        setVideoWindowData({});
        setConversationWindowData({});
        setUserProfileWindowData({});
        setUserPostsTimelineWindowData({});
        setComposeWindowData({});
        
        // Reset all counters
        setImageWindowCounter(1);
        setVideoWindowCounter(1);
        setConversationWindowCounter(1);
        setUserProfileWindowCounter(1);
        setUserPostsTimelineWindowCounter(1);
        setComposeWindowCounter(1);
        
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
              onFollowersClick={openFollowersWindow}
              onFollowingClick={openFollowingWindow}
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
              onAudioClick={openAudioPlayer}
              onYouTubeClick={openYouTubePlayer}
              onConversationClick={openConversation}
              onUserClick={openUserProfile}
              onReplyClick={openComposeWindow}
              onEmojiPickerClick={openEmojiPicker}
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
              onAudioClick={openAudioPlayer}
              onYouTubeClick={openYouTubePlayer}
              onConversationClick={openConversation}
              onUserClick={openUserProfile}
              onReplyClick={openComposeWindow}
              onEmojiPickerClick={openEmojiPicker}
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
        if (win.id === 'home-timeline') {
          return (
            <HomeTimelineWindow
              key={win.id}
              id={win.id}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onImageClick={openImageViewer}
              onVideoClick={openVideoViewer}
              onAudioClick={openAudioPlayer}
              onYouTubeClick={openYouTubePlayer}
              onConversationClick={openConversation}
              onUserClick={openUserProfile}
              onReplyClick={openComposeWindow}
              onEmojiPickerClick={openEmojiPicker}
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
        if (win.id === 'notifications') {
          return (
            <NotificationsWindow
              key={win.id}
              id={win.id}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onImageClick={openImageViewer}
              onVideoClick={openVideoViewer}
              onAudioClick={openAudioPlayer}
              onYouTubeClick={openYouTubePlayer}
              onConversationClick={openConversation}
              onUserClick={openUserProfile}
              onReplyClick={openComposeWindow}
              onEmojiPickerClick={openEmojiPicker}
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
        if (win.id.startsWith('conversation-')) {
          const conversationData = conversationWindowData[win.id];
          if (!conversationData) {
            // Skip rendering if we don't have conversation data
            return null;
          }
          
          return (
            <ConversationWindow
              key={win.id}
              id={win.id}
              statusId={conversationData.statusId}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onImageClick={openImageViewer}
              onVideoClick={openVideoViewer}
              onAudioClick={openAudioPlayer}
              onYouTubeClick={openYouTubePlayer}
              onConversationClick={openConversation}
              onUserClick={openUserProfile}
              onReplyClick={openComposeWindow}
              onEmojiPickerClick={openEmojiPicker}
              onClose={() => {
                // Clean up conversation data when window is closed
                setConversationWindowData(prev => {
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
        if (win.id.startsWith('audio-')) {
          const audioData = audioWindowData[win.id];
          if (!audioData) {
            // Skip rendering if we don't have audio data
            return null;
          }
          
          return (
            <AudioPlayerWindow
              key={win.id}
              id={win.id}
              audioUrl={audioData.audioUrl}
              audioDescription={audioData.audioDescription}
              windowNumber={audioData.windowNumber}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onClose={() => {
                // Clean up audio data when window is closed
                setAudioWindowData(prev => {
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
        if (win.id.startsWith('youtube-')) {
          const youtubeData = youtubeWindowData[win.id];
          if (!youtubeData) {
            // Skip rendering if we don't have YouTube data
            return null;
          }
          
          return (
            <YouTubePlayerWindow
              key={win.id}
              id={win.id}
              videoId={youtubeData.videoId}
              videoUrl={youtubeData.videoUrl}
              windowNumber={youtubeData.windowNumber}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onClose={() => {
                // Clean up YouTube data when window is closed
                setYoutubeWindowData(prev => {
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
        if (win.id === 'emoji-picker') {
          if (!emojiPickerStatusId) {
            // Skip rendering if we don't have status ID
            return null;
          }
          
          return (
            <EmojiReactPickerWindow
              key={win.id}
              id={win.id}
              statusId={emojiPickerStatusId}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onEmojiReact={handleEmojiReact}
              onClose={() => {
                // Clean up emoji picker state when window is closed
                setEmojiPickerStatusId(null);
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
        if (win.id.startsWith('user-profile-')) {
          const userProfileData = userProfileWindowData[win.id];
          if (!userProfileData) {
            // Skip rendering if we don't have user profile data
            return null;
          }
          
          return (
            <OtherUserProfileWindow
              key={win.id}
              id={win.id}
              userId={userProfileData.userId}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onUserPostsTimelineClick={openUserPostsTimeline}
              onMentionClick={(userAcct: string) => openComposeWindow(undefined, [`@${userAcct}`])}
              onFollowersClick={openFollowersWindow}
              onFollowingClick={openFollowingWindow}
              onClose={() => {
                // Clean up user profile data when window is closed
                setUserProfileWindowData(prev => {
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
        if (win.id.startsWith('followers-')) {
          const followersData = followersWindowData[win.id];
          if (!followersData) {
            return null;
          }
          
          return (
            <FollowersWindow
              key={win.id}
              id={win.id}
              userId={followersData.userId}
              userDisplayName={followersData.userDisplayName}
              totalCount={followersData.totalCount}
              onUserClick={openUserProfile}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onClose={() => {
                setFollowersWindowData(prev => {
                  const { [win.id]: removed, ...rest } = prev;
                  return rest;
                });
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
        if (win.id.startsWith('following-')) {
          const followingData = followingWindowData[win.id];
          if (!followingData) {
            return null;
          }
          
          return (
            <FollowingWindow
              key={win.id}
              id={win.id}
              userId={followingData.userId}
              userDisplayName={followingData.userDisplayName}
              totalCount={followingData.totalCount}
              onUserClick={openUserProfile}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onClose={() => {
                setFollowingWindowData(prev => {
                  const { [win.id]: removed, ...rest } = prev;
                  return rest;
                });
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
        if (win.id.startsWith('user-posts-')) {
          const userPostsTimelineData = userPostsTimelineWindowData[win.id];
          if (!userPostsTimelineData) {
            // Skip rendering if we don't have user posts timeline data
            return null;
          }
          
          return (
            <UserPostsTimelineWindow
              key={win.id}
              id={win.id}
              userId={userPostsTimelineData.userId}
              userAcct={userPostsTimelineData.userAcct}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onImageClick={openImageViewer}
              onVideoClick={openVideoViewer}
              onAudioClick={openAudioPlayer}
              onYouTubeClick={openYouTubePlayer}
              onConversationClick={openConversation}
              onUserClick={openUserProfile}
              onReplyClick={openComposeWindow}
              onEmojiPickerClick={openEmojiPicker}
              onClose={() => {
                // Clean up user posts timeline data when window is closed
                setUserPostsTimelineWindowData(prev => {
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
        if (win.id.startsWith('compose-') || win.id === 'compose-new') {
          const composeData = composeWindowData[win.id];
          if (!composeData) {
            // Skip rendering if we don't have compose data
            return null;
          }
          
          return (
            <PostCompositionWindow
              key={win.id}
              id={win.id}
              replyToStatusId={composeData.replyToStatusId}
              mentionHandles={composeData.mentionHandles}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onClose={() => {
                // Clean up compose data when window is closed
                setComposeWindowData(prev => {
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
        if (win.id === 'about') {
          return (
            <AboutWindow
              key={win.id}
              id={win.id}
              isFocused={win.isFocused}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onClose={() => removeWindow(win.id)}
              onFocus={() => focusWindow({ id: win.id })}
            />
          );
        }
        return null;
      })}
      
      {/* Start Menu */}
      {startMenuOpen && (
        <DesktopMenu
          position={startMenuPosition}
          items={startMenuItems}
          onClose={handleStartMenuClose}
          zIndex={9999}
          className="wtkr-taskbar-start-menu"
        />
      )}
      
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
          onStartMenuOpen={handleStartMenuOpen}
          onStartMenuClose={handleStartMenuClose}
          isStartMenuOpen={startMenuOpen}
        />
      </div>
    </div>
  );
};

export default App;
