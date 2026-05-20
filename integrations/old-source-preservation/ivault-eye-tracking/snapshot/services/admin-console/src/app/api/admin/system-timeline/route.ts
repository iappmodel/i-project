import { getAlphabetApiBaseUrl } from "@/lib/alphabet/alphabet-api-base";
import { requireAdmin } from "@/lib/api/require-admin";

function forwardHeaders(request: Request): Headers {
  const headers = new Headers();
  const auth = request.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const session = request.headers.get("x-admin-session-id");
  if (session) headers.set("x-admin-session-id", session);
  return headers;
}

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const base = getAlphabetApiBaseUrl();
  if (!base) {
    return Response.json(
      { ok: false, error: "ALPHABET_API_URL is not set; cannot proxy system timeline." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const upstream = `${base}/v1/admin/system-timeline?${url.searchParams.toString()}`;

  const res = await fetch(upstream, {
    cache: "no-store",
    headers: forwardHeaders(request)
  });

  const text = await res.text();
  const ct = res.headers.get("content-type") ?? "application/json";
  return new Response(text, { status: res.status, headers: { "content-type": ct } });
}
