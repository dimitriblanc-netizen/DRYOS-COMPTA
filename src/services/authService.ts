import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Google Drive scope as configured via set_up_oauth
provider.addScope('https://www.googleapis.com/auth/drive');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;

const TOKEN_STORAGE_KEY = 'comptadrive_gdrive_token';
const TOKEN_TIMESTAMP_KEY = 'comptadrive_gdrive_token_ts';
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minutes valid token cache

function getStoredAccessToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const ts = localStorage.getItem(TOKEN_TIMESTAMP_KEY);
    if (token && ts) {
      const elapsed = Date.now() - parseInt(ts, 10);
      if (elapsed < TOKEN_TTL_MS) {
        return token;
      }
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function saveStoredAccessToken(token: string) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // Ignore storage errors
  }
}

function clearStoredAccessToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
  } catch {
    // Ignore storage errors
  }
}

// Cache the access token in memory, initialized from secure storage if available
let cachedAccessToken: string | null = getStoredAccessToken();

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const activeToken = cachedAccessToken || getStoredAccessToken();
      if (activeToken) {
        cachedAccessToken = activeToken;
        if (onAuthSuccess) onAuthSuccess(user, activeToken);
      } else if (!isSigningIn) {
        // User is logged in to Firebase but needs fresh OAuth token interaction
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      clearStoredAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Impossible de récupérer le jeton d\'accès Google Drive depuis Firebase.');
    }

    cachedAccessToken = credential.accessToken;
    saveStoredAccessToken(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erreur lors de la connexion Google Drive:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || getStoredAccessToken();
};

export const getCurrentAuthToken = (): string | null => {
  return cachedAccessToken || getStoredAccessToken();
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    saveStoredAccessToken(token);
  } else {
    clearStoredAccessToken();
  }
};

export const signInWithGoogleDrive = googleSignIn;

export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  clearStoredAccessToken();
};

export const signOutGoogle = logout;

export const subscribeToAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export type { User };
