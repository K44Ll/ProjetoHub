import { type NextRequest, NextResponse } from "next/server";
import { createTeamDriveFolder, getDriveFile, GOOGLE_FOLDER_MIME } from "@/lib/google-drive/api";
import {
  DRIVE_OAUTH_COOKIE_PATH,
  DRIVE_OAUTH_STATE_COOKIE,
  DRIVE_OAUTH_TEAM_COOKIE,
  GOOGLE_DRIVE_SCOPE,
} from "@/lib/google-drive/config";
import { decryptDriveToken, encryptDriveToken } from "@/lib/google-drive/crypto";
import {
  DriveAccessError,
  getStoredDriveConnection,
  requireTeamDriveAccess,
} from "@/lib/google-drive/data";
import { exchangeAuthorizationCode, tokenExpiration } from "@/lib/google-drive/oauth";

function clearOAuthCookies(response: NextResponse) {
  for (const name of [
    DRIVE_OAUTH_STATE_COOKIE,
    DRIVE_OAUTH_TEAM_COOKIE,
  ]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      maxAge: 0,
      path: DRIVE_OAUTH_COOKIE_PATH,
      sameSite: "lax",
    });
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function teamRedirect(request: NextRequest, teamId: string, result: string) {
  return clearOAuthCookies(
    NextResponse.redirect(new URL(`/equipes/${teamId}?drive=${result}`, request.url)),
  );
}

export async function GET(request: NextRequest) {
  const teamId = request.cookies.get(DRIVE_OAUTH_TEAM_COOKIE)?.value || "";
  const expectedState = request.cookies.get(DRIVE_OAUTH_STATE_COOKIE)?.value;
  const receivedState = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (!teamId) {
    return clearOAuthCookies(NextResponse.redirect(new URL("/", request.url)));
  }
  if (oauthError) return teamRedirect(request, teamId, "cancelled");
  if (!expectedState || !receivedState || expectedState !== receivedState || !code) {
    return teamRedirect(request, teamId, "invalid_state");
  }

  try {
    const access = await requireTeamDriveAccess(teamId, "manager");
    const existing = await getStoredDriveConnection(access);
    const tokens = await exchangeAuthorizationCode(code);
    const grantedScopes = tokens.scope?.split(/\s+/).filter(Boolean) || [GOOGLE_DRIVE_SCOPE];

    if (!grantedScopes.includes(GOOGLE_DRIVE_SCOPE)) {
      return teamRedirect(request, teamId, "missing_scope");
    }

    const refreshToken = tokens.refresh_token
      ? tokens.refresh_token
      : existing
        ? decryptDriveToken(
            existing.refresh_token_ciphertext,
            teamId,
            existing.root_folder_id,
          )
        : null;
    if (!refreshToken) return teamRedirect(request, teamId, "missing_refresh_token");

    let rootFolderId = existing?.root_folder_id;
    let rootFolderName = existing?.root_folder_name;

    if (rootFolderId) {
      try {
        const existingFolder = await getDriveFile(tokens.access_token, rootFolderId);
        if (existingFolder.mimeType !== GOOGLE_FOLDER_MIME) {
          rootFolderId = undefined;
          rootFolderName = undefined;
        }
      } catch {
        rootFolderId = undefined;
        rootFolderName = undefined;
      }
    }

    if (!rootFolderId) {
      const desiredName = `ProjetoHub — ${access.teamName}`.slice(0, 200);
      const folder = await createTeamDriveFolder(tokens.access_token, desiredName);
      rootFolderId = folder.id;
      rootFolderName = folder.name;
    }

    const { error } = await access.supabase.from("team_drive_connections").upsert({
      team_id: teamId,
      connected_by: access.userId,
      root_folder_id: rootFolderId,
      root_folder_name: rootFolderName || `ProjetoHub — ${access.teamName}`.slice(0, 200),
      access_token_ciphertext: encryptDriveToken(tokens.access_token, teamId, rootFolderId),
      refresh_token_ciphertext: encryptDriveToken(refreshToken, teamId, rootFolderId),
      access_token_expires_at: tokenExpiration(tokens.expires_in),
      granted_scopes: grantedScopes,
    });

    if (error) throw error;
    return teamRedirect(request, teamId, "connected");
  } catch (error) {
    if (error instanceof DriveAccessError && error.status === 401) {
      return clearOAuthCookies(
        NextResponse.redirect(
          new URL(`/login?next=${encodeURIComponent(`/equipes/${teamId}`)}`, request.url),
        ),
      );
    }
    console.error("Falha ao concluir a conexão com o Google Drive.", error);
    return teamRedirect(request, teamId, "error");
  }
}
