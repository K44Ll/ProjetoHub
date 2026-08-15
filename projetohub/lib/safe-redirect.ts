const SAFE_BASE_URL = "https://projetohub.local";

export function safeInternalPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  let inspectedValue = value;
  for (let depth = 0; depth < 4; depth += 1) {
    if (
      inspectedValue.startsWith("//") ||
      inspectedValue.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(inspectedValue)
    ) {
      return fallback;
    }

    try {
      const decodedValue = decodeURIComponent(inspectedValue);
      if (decodedValue === inspectedValue) break;
      inspectedValue = decodedValue;
    } catch {
      return fallback;
    }
  }

  try {
    const url = new URL(value, SAFE_BASE_URL);
    if (url.origin !== SAFE_BASE_URL) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
