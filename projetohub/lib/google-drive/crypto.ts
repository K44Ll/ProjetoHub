import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import { getGoogleDriveEncryptionSecret } from "@/lib/google-drive/config";

const CIPHER_VERSION = "v2";
const KEY_INFO = "ProjetoHub Google Drive token encryption v2";
let cachedKey: Buffer | null = null;

function encryptionKey() {
  if (cachedKey) return cachedKey;

  const secret = getGoogleDriveEncryptionSecret();
  if (secret.length < 20) {
    throw new Error("A chave usada para cifrar os tokens do Google Drive é muito curta.");
  }

  const salt = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "ProjetoHub";
  cachedKey = Buffer.from(
    hkdfSync("sha256", Buffer.from(secret), Buffer.from(salt), Buffer.from(KEY_INFO), 32),
  );
  return cachedKey;
}

function tokenContext(teamId: string, rootFolderId: string) {
  if (!teamId || !rootFolderId) {
    throw new Error("O contexto do token do Google Drive é inválido.");
  }
  return Buffer.from(`${teamId}:${rootFolderId}`, "utf8");
}

export function encryptDriveToken(
  token: string,
  teamId: string,
  rootFolderId: string,
) {
  if (!token) throw new Error("Não é possível cifrar um token vazio.");

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(tokenContext(teamId, rootFolderId));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    CIPHER_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptDriveToken(
  value: string,
  teamId: string,
  rootFolderId: string,
) {
  const [version, encodedIv, encodedTag, encodedToken, ...extra] = value.split(".");
  if (
    version !== CIPHER_VERSION ||
    !encodedIv ||
    !encodedTag ||
    !encodedToken ||
    extra.length
  ) {
    throw new Error("O token armazenado do Google Drive possui formato inválido.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAAD(tokenContext(teamId, rootFolderId));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedToken, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
