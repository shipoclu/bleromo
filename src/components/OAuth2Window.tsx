import React, { useEffect, useRef } from 'react';
import { DesktopWindow } from 'wtkrjs';

interface OAuth2WindowProps {
  id: string;
  serverUrl: string;
  userHandle: string;
  onSuccess: (token: string, userData: any) => void;
  onError: (error: string) => void;
  onClose: () => void;
}

const OAuth2Window: React.FC<OAuth2WindowProps> = ({
  id,
  serverUrl,
  userHandle,
  onSuccess,
  onError,
  onClose
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Listen for messages from the OAuth callback page
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from our own origin or the OAuth server
      const allowedOrigins = [window.location.origin, serverUrl];
      if (!allowedOrigins.includes(event.origin)) {
        console.warn('Ignoring message from unauthorized origin:', event.origin);
        return;
      }

      if (event.data.type === 'OAUTH_SUCCESS') {
        onSuccess(event.data.token, event.data.userData);
      } else if (event.data.type === 'OAUTH_ERROR') {
        onError(event.data.error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [serverUrl, onSuccess, onError]);

  // Generate OAuth2 authorization URL
  const generateAuthUrl = () => {
    const clientId = 'bleromofw'; // This would need to be registered with each server
    const redirectUri = `${window.location.origin}/oauth-callback.html`;
    const scope = 'read write follow'; // Standard Mastodon/Pleroma scopes
    const responseType = 'code';
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      response_type: responseType,
      state: JSON.stringify({ userHandle, timestamp: Date.now() })
    });

    return `${serverUrl}/oauth/authorize?${params.toString()}`;
  };

  return (
    <DesktopWindow
      id={id}
      title={`Login to ${userHandle}`}
      initialPosition={{ x: 200, y: 100 }}
      initialSize={{ width: 600, height: 500 }}
      isFocused={true}
      isMinimized={false}
      isMaximized={false}
      zIndex={2000}
      isMinimizable={false}
      isMaximizable={false}
      isClosable={true}
      isResizable={true}
      onClose={onClose}
      onFocus={() => {}}
      onMinimize={() => {}}
      onMaximize={() => {}}
      onRestore={() => {}}
      onMove={() => {}}
      onResize={() => {}}
    >
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#c0c0c0'
      }}>
        <div style={{
          padding: '8px',
          backgroundColor: '#c0c0c0',
          borderBottom: '1px solid #808080',
          fontSize: '12px'
        }}>
          Connecting to {serverUrl}...
        </div>
        
        <iframe
          ref={iframeRef}
          src={generateAuthUrl()}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: 'white'
          }}
          title={`OAuth2 Authorization for ${userHandle}`}
          sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation"
        />
      </div>
    </DesktopWindow>
  );
};

export default OAuth2Window;