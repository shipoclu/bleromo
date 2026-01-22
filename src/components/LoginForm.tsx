import React, { useState, useEffect, useRef } from 'react';
import { startLogin, completeLogin, failLogin } from '../store/appState';

interface LoginFormProps {
  onSubmit?: (handle: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const [handle, setHandle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  useEffect(() => {
    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
        messageHandlerRef.current = null;
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Validate fediverse handle format
  const validateHandle = (input: string): boolean => {
    if (!input.trim()) return false;
    
    // Must contain exactly one @ symbol
    const parts = input.split('@');
    if (parts.length !== 2) return false;
    
    const [nickname, domain] = parts;
    
    // Validate nickname: alphanumeric plus dot, dash, underscore
    const nicknameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!nickname || !nicknameRegex.test(nickname)) return false;
    
    // Validate domain: basic domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domain || !domainRegex.test(domain)) return false;
    
    // Domain must have at least one dot and valid TLD
    if (!domain.includes('.') || domain.endsWith('.') || domain.startsWith('.')) return false;
    
    return true;
  };

  // Validate on every input change
  useEffect(() => {
    setIsValid(validateHandle(handle));
  }, [handle]);

  const getOrRegisterApp = async (serverUrl: string, domain: string) => {
    // Check if we already have app credentials for this server
    const serverAppKey = `bleromofw_app_${domain}`;
    const existingAppData = localStorage.getItem(serverAppKey);
    
    if (existingAppData) {
      try {
        const appData = JSON.parse(existingAppData);
        if (appData.client_id && appData.client_secret) {
          console.log('Using existing app credentials for', domain);
          return appData;
        }
      } catch (error) {
        console.warn('Invalid stored app data for', domain, 'registering new app');
        localStorage.removeItem(serverAppKey);
      }
    }
    
    // Register new app
    console.log('Registering new app for', domain);
    const response = await fetch(`${serverUrl}/api/v1/apps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_name: 'Bleromofw',
        redirect_uris: `${window.location.origin}/oauth-callback.html`,
        scopes: 'read write follow push',
        website: window.location.origin
      })
    });

    if (!response.ok) {
      throw new Error(`App registration failed: ${response.status} ${response.statusText}`);
    }

    const appData = await response.json();
    
    // Store app credentials permanently per-server
    localStorage.setItem(serverAppKey, JSON.stringify({
      client_id: appData.client_id,
      client_secret: appData.client_secret,
      serverUrl: serverUrl,
      domain: domain
    }));
    
    return appData;
  };

  const generateAuthUrl = (handle: string, clientId: string) => {
    const [, domain] = handle.split('@');
    const serverUrl = `https://${domain}`;
    const redirectUri = `${window.location.origin}/oauth-callback.html`;
    const scope = 'read write follow push';
    const responseType = 'code';
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      response_type: responseType,
      state: JSON.stringify({ userHandle: handle, timestamp: Date.now() })
    });

    return `${serverUrl}/oauth/authorize?${params.toString()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;
    
    setIsLoading(true);
    
    if (onSubmit) {
      onSubmit(handle.trim());
      return;
    }

    try {
      // Start the login process
      startLogin(handle.trim());

      const [, domain] = handle.split('@');
      const serverUrl = `https://${domain}`;

      // Get existing or register new app with the server
      const appData = await getOrRegisterApp(serverUrl, domain);
      
      // Store app credentials for the callback
      sessionStorage.setItem('oauth_app_data', JSON.stringify({
        client_id: appData.client_id,
        client_secret: appData.client_secret,
        serverUrl: serverUrl
      }));

      // Open popup window synchronously (required to avoid popup blocker)
      const authUrl = generateAuthUrl(handle.trim(), appData.client_id);
      const popup = window.open(
        authUrl,
        'oauth2-login',
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes'
      );

      if (!popup) {
        failLogin('Popup window was blocked. Please allow popups for this site.');
        setIsLoading(false);
        return;
      }

      // Listen for messages from the popup
      const handleMessage = (event: MessageEvent) => {
        // Security: Only accept messages from our own origin
        if (event.origin !== window.location.origin) {
          console.warn('Ignoring message from unauthorized origin:', event.origin);
          return;
        }

        if (event.data.type === 'OAUTH_SUCCESS') {
          completeLogin(event.data.token, event.data.userData, event.data.serverUrl);
          cleanup();
        } else if (event.data.type === 'OAUTH_ERROR') {
          failLogin(event.data.error);
          cleanup();
        }
      };

      // Track if we've already processed a result to avoid race conditions
      let hasProcessedResult = false;

      // Monitor popup window closure
      const checkClosed = setInterval(() => {
        if (popup.closed && !hasProcessedResult) {
          failLogin('OAuth window was closed by user');
          cleanup();
        }
      }, 1000);
      intervalRef.current = checkClosed;

      const cleanup = () => {
        hasProcessedResult = true;
        window.removeEventListener('message', handleMessage);
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsLoading(false);
        sessionStorage.removeItem('oauth_app_data');
        if (!popup.closed) {
          popup.close();
        }
      };

      window.addEventListener('message', handleMessage);
      messageHandlerRef.current = handleMessage;

    } catch (error) {
      console.error('OAuth setup failed:', error);
      failLogin(`Failed to register app with server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 style={{
        marginBottom: '20px',
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        Welcome to Bleromofw
      </h2>
      
      <p style={{
        marginBottom: '20px',
        fontSize: '12px',
        color: '#000080'
      }}>
        Enter your fediverse handle to connect
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="username@server.tld"
            style={{
              width: '250px',
              padding: '4px 8px',
              fontSize: '12px',
              border: '2px inset #c0c0c0',
              backgroundColor: 'white',
              borderColor: !handle ? '#c0c0c0' : isValid ? '#008000' : '#ff0000'
            }}
            disabled={isLoading}
            autoFocus
          />
          {handle && !isValid && (
            <div style={{
              fontSize: '10px',
              color: '#ff0000',
              marginTop: '4px'
            }}>
              Please enter a valid fediverse handle (username@domain.tld)
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !isValid}
          style={{
            padding: '6px 20px',
            fontSize: '12px',
            border: '2px outset #c0c0c0',
            backgroundColor: '#c0c0c0',
            cursor: isLoading || !isValid ? 'default' : 'pointer',
            minWidth: '80px',
            borderRadius: '0',
            fontFamily: 'var(--win98-font)',
            opacity: isLoading || !isValid ? 0.6 : 1
          }}
        >
          {isLoading ? 'Connecting...' : 'Log In'}
        </button>
      </form>
    </>
  );
};

export default LoginForm;
