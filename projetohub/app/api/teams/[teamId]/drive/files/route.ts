import {
  GoogleDriveApiError,
  GOOGLE_FOLDER_MIME,
  listTeamDriveFiles,
  startResumableDriveUpload,
} from "@/lib/google-drive/api";
import {
  DriveAccessError,
  getConnectionAccessToken,
  requireStoredDriveConnection,
  requireTeamDriveAccess,
} from "@/lib/google-drive/data";
import { crossOriginResponse, isSameOriginMutation } from "@/lib/http-security";

const MAX_UPLOAD_SIZE = 250 * 1024 * 1024;
const MIME_TYPE_PATTERN = /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const MAX_REQUEST_BODY_SIZE = 4096;

function safeGoogleDriveLink(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const allowedHosts = new Set([
      "drive.google.com",
      "docs.google.com",
      "sheets.google.com",
      "slides.google.com",
    ]);
    return url.protocol === "https:" && allowedHosts.has(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function apiError(error: unknown, fallback: string) {
  if (error instanceof DriveAccessError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof GoogleDriveApiError) {
    const status = error.status === 401 ? 409 : Math.min(Math.max(error.status, 400), 599);
    console.error(fallback, error);
    return Response.json(
      {
        error:
          error.status === 401
            ? "A autorização do Google Drive precisa ser renovada."
            : "O Google Drive não conseguiu concluir a operação.",
        code: error.status === 401 ? "drive_reconnect_required" : "drive_error",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error(fallback, error);
  return Response.json(
    { error: fallback, code: "internal_error" },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    const access = await requireTeamDriveAccess(teamId, "member");
    const connection = await requireStoredDriveConnection(access);
    const accessToken = await getConnectionAccessToken(access, connection);
    const files = await listTeamDriveFiles(accessToken, connection.root_folder_id);

    return Response.json(
      {
        files: files.map((file) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size || null,
          modifiedTime: file.modifiedTime || null,
          webViewLink: safeGoogleDriveLink(file.webViewLink),
          isFolder: file.mimeType === GOOGLE_FOLDER_MIME,
          canDownload: file.capabilities?.canDownload !== false,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, "Não foi possível carregar os arquivos da equipe.");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  if (!isSameOriginMutation(request)) return crossOriginResponse();

  try {
    const { teamId } = await params;
    const access = await requireTeamDriveAccess(teamId, "contributor");
    const connection = await requireStoredDriveConnection(access);
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_SIZE) {
      return Response.json({ error: "A solicitação é grande demais." }, { status: 413 });
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_REQUEST_BODY_SIZE) {
      return Response.json({ error: "A solicitação é grande demais." }, { status: 413 });
    }

    let body: { name?: unknown; mimeType?: unknown; size?: unknown };
    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch {
      return Response.json({ error: "A solicitação contém JSON inválido." }, { status: 400 });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const size = typeof body.size === "number" ? body.size : Number.NaN;
    const mimeType =
      typeof body.mimeType === "string" && MIME_TYPE_PATTERN.test(body.mimeType)
        ? body.mimeType
        : "application/octet-stream";

    if (
      !name ||
      name.length > 255 ||
      name === "." ||
      name === ".." ||
      name.includes("/") ||
      name.includes("\\") ||
      CONTROL_CHARACTERS.test(name)
    ) {
      return Response.json({ error: "O nome do arquivo é inválido." }, { status: 400 });
    }
    if (!Number.isInteger(size) || size < 1 || size > MAX_UPLOAD_SIZE) {
      return Response.json(
        { error: "O arquivo deve ter entre 1 byte e 250 MB." },
        { status: 400 },
      );
    }

    const accessToken = await getConnectionAccessToken(access, connection);
    const uploadUrl = await startResumableDriveUpload(
      accessToken,
      connection.root_folder_id,
      { name, mimeType, size },
    );

    return Response.json(
      { uploadUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, "Não foi possível iniciar o envio do arquivo.");
  }
}
