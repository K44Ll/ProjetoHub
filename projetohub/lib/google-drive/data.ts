import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptDriveToken, encryptDriveToken } from "@/lib/google-drive/crypto";
import { GoogleOAuthError, refreshGoogleAccessToken, tokenExpiration } from "@/lib/google-drive/oauth";
import type { TeamRole } from "@/types/app";
import type { Database } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{5,255}$/;

type AppSupabaseClient = SupabaseClient<Database>;
type RequiredPermission = "member" | "contributor" | "manager";

const rolePermissions: Record<TeamRole, Set<RequiredPermission>> = {
  reader: new Set(["member"]),
  editor: new Set(["member", "contributor"]),
  co_leader: new Set(["member", "contributor", "manager"]),
  leader: new Set(["member", "contributor", "manager"]),
};

export class DriveAccessError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DriveAccessError";
  }
}

export type TeamDriveAccess = {
  supabase: AppSupabaseClient;
  teamId: string;
  teamName: string;
  userId: string;
  role: TeamRole;
};

export type StoredDriveConnection = Database["public"]["Tables"]["team_drive_connections"]["Row"];

export async function requireTeamDriveAccess(
  teamId: string,
  permission: RequiredPermission,
): Promise<TeamDriveAccess> {
  if (!UUID_PATTERN.test(teamId)) {
    throw new DriveAccessError("Equipe inválida.", 400, "invalid_team");
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const userId = authData?.claims.sub;
  if (authError || !userId) {
    throw new DriveAccessError("Sua sessão expirou. Entre novamente.", 401, "unauthorized");
  }

  const [teamResult, memberResult] = await Promise.all([
    supabase.from("teams").select("name").eq("id", teamId).maybeSingle(),
    supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (teamResult.error || memberResult.error) {
    throw new DriveAccessError(
      "Não foi possível validar o acesso à equipe.",
      500,
      "team_lookup_failed",
    );
  }
  if (!teamResult.data || !memberResult.data) {
    throw new DriveAccessError("Você não participa desta equipe.", 403, "forbidden");
  }

  const role = memberResult.data.role as TeamRole;
  if (!rolePermissions[role]?.has(permission)) {
    throw new DriveAccessError(
      "Sua função não permite realizar esta operação.",
      403,
      "forbidden",
    );
  }

  return {
    supabase,
    teamId,
    teamName: teamResult.data.name,
    userId,
    role,
  };
}

export async function getStoredDriveConnection(access: TeamDriveAccess) {
  const { data, error } = await access.supabase
    .from("team_drive_connections")
    .select("*")
    .eq("team_id", access.teamId)
    .maybeSingle();

  if (error) {
    throw new DriveAccessError(
      "Não foi possível carregar a conexão com o Google Drive.",
      500,
      "connection_lookup_failed",
    );
  }
  return data;
}

export async function requireStoredDriveConnection(access: TeamDriveAccess) {
  const connection = await getStoredDriveConnection(access);
  if (!connection) {
    throw new DriveAccessError(
      "Esta equipe ainda não conectou uma pasta do Google Drive.",
      409,
      "drive_not_connected",
    );
  }
  if (!DRIVE_FILE_ID_PATTERN.test(connection.root_folder_id)) {
    throw new DriveAccessError(
      "A conexão do Google Drive está inválida. Conecte a equipe novamente.",
      409,
      "drive_reconnect_required",
    );
  }
  return connection;
}

export async function getConnectionAccessToken(
  access: TeamDriveAccess,
  connection: StoredDriveConnection,
) {
  if (Date.parse(connection.access_token_expires_at) > Date.now() + 60_000) {
    return decryptDriveToken(
      connection.access_token_ciphertext,
      access.teamId,
      connection.root_folder_id,
    );
  }

  try {
    const refreshed = await refreshGoogleAccessToken(
      decryptDriveToken(
        connection.refresh_token_ciphertext,
        access.teamId,
        connection.root_folder_id,
      ),
    );
    const expiresAt = tokenExpiration(refreshed.expires_in);

    if (rolePermissions[access.role].has("manager")) {
      await access.supabase
        .from("team_drive_connections")
        .update({
          access_token_ciphertext: encryptDriveToken(
            refreshed.access_token,
            access.teamId,
            connection.root_folder_id,
          ),
          access_token_expires_at: expiresAt,
        })
        .eq("team_id", access.teamId);
    }

    return refreshed.access_token;
  } catch (error) {
    if (error instanceof GoogleOAuthError && error.code === "invalid_grant") {
      throw new DriveAccessError(
        "A autorização do Google Drive expirou ou foi removida. Conecte a equipe novamente.",
        409,
        "drive_reconnect_required",
      );
    }
    throw error;
  }
}
