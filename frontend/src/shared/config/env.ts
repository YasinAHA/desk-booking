type FrontendEnv = {
  apiBaseUrl: string;
  appEnv: "development" | "staging" | "production";
};

const DEFAULT_API_BASE_URL = "http://localhost:3001";
const DEFAULT_APP_ENV: FrontendEnv["appEnv"] = "development";

function parseAppEnv(input: unknown): FrontendEnv["appEnv"] {
  if (input === "development" || input === "staging" || input === "production") {
    return input;
  }
  return DEFAULT_APP_ENV;
}

export const env: FrontendEnv = {
  apiBaseUrl:
    (typeof import.meta.env.VITE_API_BASE_URL === "string"
      ? import.meta.env.VITE_API_BASE_URL
      : undefined) ?? DEFAULT_API_BASE_URL,
  appEnv: parseAppEnv(import.meta.env.VITE_APP_ENV)
};
