import type { NextRequest } from "next/server";

/**
 * Server-side forwarder from the web app's origin to the Laravel API.
 *
 * Why not a plain Next rewrite: Laravel (Sanctum) only treats a request as the first-party web app, and so
 * only applies session cookies to it, when it carries an Origin/Referer from a configured host. Browsers and
 * privacy extensions do not always send those on GET requests. Here the first-party origin is set explicitly.
 * CSRF protection is unaffected: state-changing requests still need the X-XSRF-TOKEN header that only
 * scripts on this origin can read.
 *
 * Read at runtime from the environment:
 *   BACKEND_INTERNAL_URL  where Laravel is reachable from this server (default http://localhost:8000)
 *   FRONTEND_ORIGIN       the public origin of this app (default http://localhost:3000)
 */
const backendUrl = () => (process.env.BACKEND_INTERNAL_URL || "http://localhost:8000").replace(/\/$/, "");
const frontendOrigin = () => (process.env.FRONTEND_ORIGIN || "http://localhost:3000").replace(/\/$/, "");

// Hop-by-hop or recomputed by fetch: never copy these across the proxy.
const DROP_REQUEST = new Set(["host", "connection", "content-length", "transfer-encoding", "keep-alive", "upgrade"]);
const DROP_RESPONSE = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"]);

export async function forwardToBackend(req: NextRequest, backendPath: string): Promise<Response> {
  const target = `${backendUrl()}${backendPath}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!DROP_REQUEST.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set("origin", frontendOrigin());
  headers.set("referer", `${frontendOrigin()}/`);

  const hasBody = !["GET", "HEAD"].includes(req.method);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      // @ts-expect-error duplex is required by Node's fetch for streamed bodies but missing from the DOM types
      duplex: hasBody ? "half" : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return Response.json({ success: false, message: "The server is temporarily unavailable.", code: "backend_unreachable" }, { status: 503 });
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie" && !DROP_RESPONSE.has(key.toLowerCase())) out.set(key, value);
  });
  // Several Set-Cookie headers must stay separate (session + XSRF).
  for (const cookie of upstream.headers.getSetCookie()) out.append("set-cookie", cookie);

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
