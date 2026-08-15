import { type NextRequest, NextResponse } from "next/server";
import {
  DRIVE_OAUTH_COOKIE_PATH,
  DRIVE_OAUTH_STATE_COOKIE,
  DRIVE_OAUTH_TEAM_COOKIE,
} from "@/lib/google-drive/config";
import { DriveAccessError, requireTeamDriveAccess } from "@/lib/google-drive/data";
import { createGoogleAuthorizationUrl, createOAuthState } from "@/lib/google-drive/oauth";

export async function GET(request: NextRequest) {
  const teamId = request.nextUrl.searchParams.get("teamId")?.trim() || "";

  try {
    await requireTeamDriveAccess(teamId, "manager");
  } catch (error) {
    if (error instanceof DriveAccessError) {
      if (error.status === 400) return NextResponse.redirect(new URL("/", request.url));
      if (error.status === 401) {
        return NextResponse.redirect(
          new URL(`/login?next=${encodeURIComponent(`/equipes/${teamId}`)}`, request.url),
        );
      }
      if (error.status >= 500) {
        return NextResponse.redirect(new URL(`/equipes/${teamId}?drive=error`, request.url));
      }
    }
    return NextResponse.redirect(new URL(`/equipes/${teamId}?drive=forbidden`, request.url));
  }

  const state = createOAuthState();
  const authorizationUrl = createGoogleAuthorizationUrl(state);
  const response = NextResponse.redirect(authorizationUrl);
  const cookieOptions = {
    httpOnly: true,
    maxAge: 10 * 60,
    path: DRIVE_OAUTH_COOKIE_PATH,
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
  };

  response.cookies.set(DRIVE_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(DRIVE_OAUTH_TEAM_COOKIE, teamId, cookieOptions);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
