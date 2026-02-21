type FrontendEnv = {
  apiBaseUrl: string;
};

const DEFAULT_API_BASE_URL = "http://localhost:3001";

export const env: FrontendEnv = {
  apiBaseUrl:
    (typeof import.meta.env.VITE_API_BASE_URL === "string"
      ? import.meta.env.VITE_API_BASE_URL
      : undefined) ?? DEFAULT_API_BASE_URL
};
