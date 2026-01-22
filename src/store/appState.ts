import { proxy } from 'valtio';

export interface UserData {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  header: string;
  note: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
}

export interface AppState {
  isLoggedIn: boolean;
  isLoggingIn: boolean;
  userHandle: string | null;
  serverUrl: string | null;
  accessToken: string | null;
  userData: UserData | null;
  followRequestDecisions: Record<string, 'approved' | 'denied'>;
}

export const appState = proxy<AppState>({
  isLoggedIn: false,
  isLoggingIn: false,
  userHandle: null,
  serverUrl: null,
  accessToken: null,
  userData: null,
  followRequestDecisions: {},
});

export const startLogin = (handle: string) => {
  const [username, server] = handle.split('@');
  if (username && server) {
    appState.isLoggingIn = true;
    appState.userHandle = handle;
    appState.serverUrl = `https://${server}`;
  }
};

export const completeLogin = (token: string, userData: UserData, serverUrl: string) => {
  appState.isLoggedIn = true;
  appState.isLoggingIn = false;
  appState.accessToken = token;
  appState.userData = userData;
  appState.serverUrl = serverUrl;
  appState.userHandle = userData.acct;
  
  localStorage.setItem('bleromofw_auth', JSON.stringify({
    isLoggedIn: true,
    userHandle: userData.acct,
    serverUrl: serverUrl,
    accessToken: token,
    userData: userData,
  }));
};

export const failLogin = (error: string) => {
  console.error('Login failed:', error);
  appState.isLoggingIn = false;
  appState.userHandle = null;
  appState.serverUrl = null;
  alert(`Login failed: ${error}`);
};

export const logout = () => {
  appState.isLoggedIn = false;
  appState.isLoggingIn = false;
  appState.userHandle = null;
  appState.serverUrl = null;
  appState.accessToken = null;
  appState.userData = null;
  appState.followRequestDecisions = {};
  
  // Only remove auth data, keep OAuth app credentials per-server
  localStorage.removeItem('bleromofw_auth');
  
  // Note: OAuth app credentials (bleromofw_app_*) are intentionally preserved
  // so users don't need to re-register apps when logging back into the same server
};

export const loadStoredAuth = () => {
  try {
    const stored = localStorage.getItem('bleromofw_auth');
    if (stored) {
      const auth = JSON.parse(stored);
      if (auth.isLoggedIn && auth.userHandle && auth.serverUrl && auth.accessToken && auth.userData) {
        appState.isLoggedIn = auth.isLoggedIn;
        appState.userHandle = auth.userHandle;
        appState.serverUrl = auth.serverUrl;
        appState.accessToken = auth.accessToken;
        appState.userData = auth.userData;
      }
    }
  } catch (error) {
    console.error('Failed to load stored auth:', error);
    localStorage.removeItem('bleromofw_auth');
  }
};
