import "server-only";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
export const GOOGLE_FOLDER_MIME = "application/vnd.google-apps.folder";
const GOOGLE_MIME_PREFIX = "application/vnd.google-apps.";

export type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  webViewLink?: string;
  capabilities?: {
    canDownload?: boolean;
  };
};

type GoogleDriveListResponse = {
  files?: GoogleDriveFile[];
  nextPageToken?: string;
};

type GoogleApiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
  };
};

export class GoogleDriveApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GoogleDriveApiError";
  }
}

async function driveRequest<T>(
  url: URL,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=UTF-8");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    let message = "O Google Drive não conseguiu concluir a operação.";
    try {
      const payload = (await response.json()) as GoogleApiErrorPayload;
      message = payload.error?.message || message;
    } catch {
      // A resposta de erro pode não conter JSON.
    }
    throw new GoogleDriveApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function createTeamDriveFolder(
  accessToken: string,
  folderName: string,
) {
  const url = new URL(`${DRIVE_API_BASE}/files`);
  url.searchParams.set("fields", "id,name,mimeType,webViewLink");
  return driveRequest<GoogleDriveFile>(url, accessToken, {
    method: "POST",
    body: JSON.stringify({ name: folderName, mimeType: GOOGLE_FOLDER_MIME }),
  });
}

export async function getDriveFile(accessToken: string, fileId: string) {
  const url = new URL(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set(
    "fields",
    "id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,capabilities(canDownload)",
  );
  return driveRequest<GoogleDriveFile>(url, accessToken);
}

export async function listTeamDriveFiles(accessToken: string, rootFolderId: string) {
  const files: GoogleDriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${DRIVE_API_BASE}/files`);
    url.searchParams.set("q", `'${rootFolderId}' in parents and trashed = false`);
    url.searchParams.set("spaces", "drive");
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("orderBy", "folder,name_natural");
    url.searchParams.set(
      "fields",
      "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,capabilities(canDownload))",
    );
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const page = await driveRequest<GoogleDriveListResponse>(url, accessToken);
    files.push(...(page.files ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken && files.length < 1000);

  return files;
}

export async function startResumableDriveUpload(
  accessToken: string,
  rootFolderId: string,
  file: { name: string; mimeType: string; size: number },
) {
  const url = new URL(`${DRIVE_UPLOAD_BASE}/files`);
  url.searchParams.set("uploadType", "resumable");
  url.searchParams.set("fields", "id,name,mimeType,size,modifiedTime,webViewLink");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(file.size),
      "X-Upload-Content-Type": file.mimeType,
    },
    body: JSON.stringify({ name: file.name, parents: [rootFolderId] }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    let message = "Não foi possível iniciar o envio para o Google Drive.";
    try {
      const payload = (await response.json()) as GoogleApiErrorPayload;
      message = payload.error?.message || message;
    } catch {
      // A resposta de erro pode não conter JSON.
    }
    throw new GoogleDriveApiError(message, response.status);
  }

  const uploadUrl = response.headers.get("Location");
  if (!uploadUrl) {
    throw new GoogleDriveApiError("O Google Drive não retornou a sessão de envio.", 502);
  }

  try {
    const parsedUploadUrl = new URL(uploadUrl);
    if (
      parsedUploadUrl.protocol !== "https:" ||
      !(
        parsedUploadUrl.hostname === "googleapis.com" ||
        parsedUploadUrl.hostname.endsWith(".googleapis.com")
      )
    ) {
      throw new Error("unexpected upload host");
    }
    return parsedUploadUrl.toString();
  } catch {
    throw new GoogleDriveApiError("O Google Drive retornou uma sessão inválida.", 502);
  }
}

const nativeExportFormats: Record<string, { mimeType: string; extension: string }> = {
  "application/vnd.google-apps.document": {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: ".docx",
  },
  "application/vnd.google-apps.spreadsheet": {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: ".xlsx",
  },
  "application/vnd.google-apps.presentation": {
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: ".pptx",
  },
  "application/vnd.google-apps.drawing": {
    mimeType: "application/pdf",
    extension: ".pdf",
  },
};

export async function downloadDriveFile(
  accessToken: string,
  file: GoogleDriveFile,
) {
  const nativeFormat = nativeExportFormats[file.mimeType];
  const isNativeGoogleFile = file.mimeType.startsWith(GOOGLE_MIME_PREFIX);

  if (isNativeGoogleFile && !nativeFormat) {
    throw new GoogleDriveApiError(
      "Este formato do Google Workspace não possui exportação disponível aqui.",
      400,
    );
  }

  const url = nativeFormat
    ? new URL(`${DRIVE_API_BASE}/files/${encodeURIComponent(file.id)}/export`)
    : new URL(`${DRIVE_API_BASE}/files/${encodeURIComponent(file.id)}`);

  if (nativeFormat) {
    url.searchParams.set("mimeType", nativeFormat.mimeType);
  } else {
    url.searchParams.set("alt", "media");
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new GoogleDriveApiError("Não foi possível baixar este arquivo.", response.status);
  }

  const filename = nativeFormat ? `${file.name}${nativeFormat.extension}` : file.name;
  return {
    filename,
    mimeType:
      nativeFormat?.mimeType || response.headers.get("Content-Type") || file.mimeType,
    response,
  };
}
