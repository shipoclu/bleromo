import { proxy } from 'valtio';

export interface AppState {
  isLoggedIn: boolean;
  userHandle: string | null;
  serverUrl: string | null;
}

export const appState = proxy<AppState>({
  isLoggedIn: false,
  userHandle: null,
  serverUrl: null,
});

export const login = (handle: string) => {
  const [username, server] = handle.split('@');
  if (username && server) {
    appState.isLoggedIn = true;
    appState.userHandle = handle;
    appState.serverUrl = `https://${server}`;
    
    localStorage.setItem('bleromofw_auth', JSON.stringify({
      isLoggedIn: true,
      userHandle: handle,
      serverUrl: `https://${server}`,
    }));
  }
};

export const logout = () => {
  appState.isLoggedIn = false;
  appState.userHandle = null;
  appState.serverUrl = null;
  
  localStorage.removeItem('bleromofw_auth');
};

export const loadStoredAuth = () => {
  try {
    const stored = localStorage.getItem('bleromofw_auth');
    if (stored) {
      const auth = JSON.parse(stored);
      if (auth.isLoggedIn && auth.userHandle && auth.serverUrl) {
        appState.isLoggedIn = auth.isLoggedIn;
        appState.userHandle = auth.userHandle;
        appState.serverUrl = auth.serverUrl;
      }
    }
  } catch (error) {
    console.error('Failed to load stored auth:', error);
    localStorage.removeItem('bleromofw_auth');
  }
};