const ACCESS_TOKEN_KEY = "deskbooking_access_token";
const REFRESH_TOKEN_KEY = "deskbooking_refresh_token";
const SESSION_CHANGED_EVENT = "auth:session-changed";

export type StoredSessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export function getStoredTokens(): StoredSessionTokens | null {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export function setStoredTokens(tokens: StoredSessionTokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  globalThis.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  globalThis.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export function onStoredSessionChange(callback: () => void): () => void {
  globalThis.addEventListener(SESSION_CHANGED_EVENT, callback);
  return () => {
    globalThis.removeEventListener(SESSION_CHANGED_EVENT, callback);
  };
}
