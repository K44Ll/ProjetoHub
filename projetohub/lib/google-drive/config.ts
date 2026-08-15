import "server-only";

export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export const DRIVE_OAUTH_COOKIE_PATH = "/api/integrations/google-drive";
export const DRIVE_OAUTH_STATE_COOKIE = "projetohub_drive_oauth_state";
export const DRIVE_OAUTH_TEAM_COOKIE = "projetohub_drive_oauth_team";

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`A variável de ambiente ${name} não foi configurada.`);
  }
  return value;
}

export function getGoogleDriveConfig() {
  const redirectUri = requiredEnvironmentValue("GOOGLE_DRIVE_REDIRECT_URI");
  let parsedRedirectUri: URL;

  try {
    parsedRedirectUri = new URL(redirectUri);
  } catch {
    throw new Error("GOOGLE_DRIVE_REDIRECT_URI não contém uma URL válida.");
  }

  const isLocalHttp =
    parsedRedirectUri.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(parsedRedirectUri.hostname);
  if (
    (parsedRedirectUri.protocol !== "https:" && !isLocalHttp) ||
    parsedRedirectUri.username ||
    parsedRedirectUri.password
  ) {
    throw new Error(
      "GOOGLE_DRIVE_REDIRECT_URI deve usar HTTPS (ou HTTP apenas em localhost).",
    );
  }

  return {
    clientId: requiredEnvironmentValue("GOOGLE_DRIVE_CLIENT_ID"),
    clientSecret: requiredEnvironmentValue("GOOGLE_DRIVE_CLIENT_SECRET"),
    redirectUri,
  };
}

export function getGoogleDriveEncryptionSecret() {
  return (
    process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY?.trim() ||
    requiredEnvironmentValue("GOOGLE_DRIVE_CLIENT_SECRET")
  );
}
