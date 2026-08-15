const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isSameOriginMutation(request: Request) {
  if (!MUTATION_METHODS.has(request.method.toUpperCase())) return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function crossOriginResponse() {
  return Response.json(
    { error: "A origem desta solicitação não é permitida." },
    {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
