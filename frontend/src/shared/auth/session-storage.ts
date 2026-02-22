const ACCESS_TOKEN_KEY = "deskbooking_access_token";
const SESSION_CHANGED_EVENT = "auth:session-changed";

export type StoredSessionTokens = {
  accessToken: string;
  refreshToken?: string;
};

export function getStoredTokens(): StoredSessionTokens | null {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!accessToken) {
    return null;
  }

  return { accessToken };
}

export function setStoredTokens(tokens: StoredSessionTokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  globalThis.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  globalThis.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export function onStoredSessionChange(callback: () => void): () => void {
  globalThis.addEventListener(SESSION_CHANGED_EVENT, callback);
  return () => {
    globalThis.removeEventListener(SESSION_CHANGED_EVENT, callback);
  };
}
