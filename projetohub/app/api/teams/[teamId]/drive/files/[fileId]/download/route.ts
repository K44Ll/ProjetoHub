import { GoogleDriveApiError, GOOGLE_FOLDER_MIME, downloadDriveFile, getDriveFile } from "@/lib/google-drive/api";
import {
  DriveAccessError,
  getConnectionAccessToken,
  requireStoredDriveConnection,
  requireTeamDriveAccess,
} from "@/lib/google-drive/data";

const DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{5,255}$/;

function safeAsciiFilename(filename: string) {
  return (
    filename
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/["\\/]/g, "_")
      .trim()
      .slice(0, 150) || "arquivo"
  );
}

function encodedFilename(filename: string) {
  return encodeURIComponent(filename).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; fileId: string }> },
) {
  try {
    const { teamId, fileId } = await params;
    if (!DRIVE_FILE_ID_PATTERN.test(fileId)) {
      return Response.json({ error: "Arquivo inválido." }, { status: 400 });
    }

    const access = await requireTeamDriveAccess(teamId, "member");
    const connection = await requireStoredDriveConnection(access);
    const accessToken = await getConnectionAccessToken(access, connection);
    const file = await getDriveFile(accessToken, fileId);

    if (!file.parents?.includes(connection.root_folder_id)) {
      return Response.json({ error: "Arquivo não pertence a esta equipe." }, { status: 403 });
    }
    if (file.mimeType === GOOGLE_FOLDER_MIME) {
      return Response.json({ error: "Pastas devem ser abertas no Google Drive." }, { status: 400 });
    }
    if (file.capabilities?.canDownload === false) {
      return Response.json({ error: "O download deste arquivo não é permitido." }, { status: 403 });
    }

    const download = await downloadDriveFile(accessToken, file);
    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${safeAsciiFilename(download.filename)}"; filename*=UTF-8''${encodedFilename(download.filename)}`,
      "Content-Type": download.mimeType,
      "X-Content-Type-Options": "nosniff",
    });
    const contentLength = download.response.headers.get("Content-Length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(download.response.body, { status: 200, headers });
  } catch (error) {
    if (error instanceof DriveAccessError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    if (error instanceof GoogleDriveApiError) {
      return Response.json(
        { error: error.message },
        { status: Math.min(Math.max(error.status, 400), 599) },
      );
    }
    console.error("Não foi possível baixar o arquivo do Google Drive.", error);
    return Response.json({ error: "Não foi possível baixar o arquivo." }, { status: 500 });
  }
}
