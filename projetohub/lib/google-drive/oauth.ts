import "server-only";

import { randomBytes } from "node:crypto";
import {
  getGoogleDriveConfig,
  GOOGLE_DRIVE_SCOPE,
} from "@/lib/google-drive/config";

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
};

type GoogleTokenError = {
  error?: string;
  error_description?: string;
};

export class GoogleOAuthError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "GoogleOAuthError";
  }
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function createGoogleAuthorizationUrl(state: string) {
  const config = getGoogleDriveConfig();
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    access_type: "offline",
    client_id: config.clientId,
    include_granted_scopes: "true",
    prompt: "consent",
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_DRIVE_SCOPE,
    state,
  }).toString();
  return url;
}

async function requestTokens(body: URLSearchParams) {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json()) as GoogleTokenResponse | GoogleTokenError;

  if (!response.ok || !("access_token" in payload)) {
    const error = payload as GoogleTokenError;
    throw new GoogleOAuthError(
      error.error_description || "O Google recusou a autorização do Drive.",
      error.error,
    );
  }

  return payload;
}

export async function exchangeAuthorizationCode(code: string) {
  const config = getGoogleDriveConfig();
  return requestTokens(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  );
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const config = getGoogleDriveConfig();
  return requestTokens(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

export function tokenExpiration(expiresInSeconds: number) {
  const safeLifetime = Number.isFinite(expiresInSeconds) ? expiresInSeconds : 3600;
  return new Date(Date.now() + Math.max(60, safeLifetime) * 1000).toISOString();
}
