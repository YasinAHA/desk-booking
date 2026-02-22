const SESSION_CHANGED_EVENT = "auth:session-changed";

let memoryAccessToken: string | null = null;

export type StoredSessionTokens = {
  accessToken: string;
  refreshToken?: string;
};

export function getStoredTokens(): StoredSessionTokens | null {
  if (!memoryAccessToken) {
    return null;
  }

  return { accessToken: memoryAccessToken };
}

export function setStoredTokens(tokens: StoredSessionTokens): void {
  memoryAccessToken = tokens.accessToken;
  globalThis.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export function clearStoredTokens(): void {
  memoryAccessToken = null;
  globalThis.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export function onStoredSessionChange(callback: () => void): () => void {
  globalThis.addEventListener(SESSION_CHANGED_EVENT, callback);
  return () => {
    globalThis.removeEventListener(SESSION_CHANGED_EVENT, callback);
  };
}
