import { DriveAccessError, requireTeamDriveAccess } from "@/lib/google-drive/data";
import { crossOriginResponse, isSameOriginMutation } from "@/lib/http-security";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  if (!isSameOriginMutation(request)) return crossOriginResponse();

  try {
    const { teamId } = await params;
    const access = await requireTeamDriveAccess(teamId, "manager");
    const { data, error } = await access.supabase
      .from("team_drive_connections")
      .delete()
      .eq("team_id", teamId)
      .select("team_id")
      .maybeSingle();

    if (error || !data) {
      return Response.json(
        { error: "Não foi possível desconectar o Google Drive." },
        { status: 500 },
      );
    }
    return Response.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof DriveAccessError ? error.status : 500;
    const message =
      error instanceof DriveAccessError
        ? error.message
        : "Não foi possível desconectar o Google Drive.";
    return Response.json({ error: message }, { status });
  }
}
