import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  process.env.BACKEND_INTERNAL_URL = "http://backend:8000/";
  process.env.FRONTEND_ORIGIN = "https://clinic.example";
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function upstream(body: string, init: { status?: number; cookies?: string[]; headers?: Record<string, string> } = {}) {
  const headers = new Headers({ "content-type": "application/json", "content-encoding": "gzip", "content-length": "999", ...init.headers });
  for (const c of init.cookies ?? []) headers.append("set-cookie", c);
  return new Response(body, { status: init.status ?? 200, headers });
}

describe("forwardToBackend", () => {
  it("targets the backend with path and query, and presents the configured first-party origin", async () => {
    fetchMock.mockResolvedValue(upstream("{}"));
    const req = new NextRequest("http://localhost:3000/api/patients?search=asha", {
      headers: { origin: "http://evil.example", referer: "http://evil.example/x", cookie: "laravel_session=abc", "x-xsrf-token": "tok", host: "localhost:3000" },
    });

    await forwardToBackend(req, "/api/patients");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend:8000/api/patients?search=asha");
    const sent = init.headers as Headers;
    expect(sent.get("origin")).toBe("https://clinic.example"); // never the caller's own claim
    expect(sent.get("referer")).toBe("https://clinic.example/");
    expect(sent.get("cookie")).toBe("laravel_session=abc");
    expect(sent.get("x-xsrf-token")).toBe("tok");
    expect(sent.has("host")).toBe(false);
  });

  it("keeps multiple Set-Cookie headers separate and drops headers that no longer match the body", async () => {
    fetchMock.mockResolvedValue(upstream('{"ok":true}', { cookies: ["XSRF-TOKEN=a; Path=/", "laravel_session=b; Path=/; HttpOnly"] }));

    const res = await forwardToBackend(new NextRequest("http://localhost:3000/api/user"), "/api/user");

    expect(res.headers.getSetCookie()).toEqual(["XSRF-TOKEN=a; Path=/", "laravel_session=b; Path=/; HttpOnly"]);
    expect(res.headers.get("content-encoding")).toBeNull();
    expect(res.headers.get("content-length")).toBeNull();
    expect(await res.json()).toEqual({ ok: true });
  });

  it("does not follow redirects and passes the upstream status through", async () => {
    fetchMock.mockResolvedValue(upstream("{}", { status: 419 }));
    const res = await forwardToBackend(new NextRequest("http://localhost:3000/api/x", { method: "POST", body: "{}" }), "/api/x");
    expect(res.status).toBe(419);
    expect(fetchMock.mock.calls[0][1].redirect).toBe("manual");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });

  it("returns a clean 503 (no stack, no internals) when the backend is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:8000"));
    const res = await forwardToBackend(new NextRequest("http://localhost:3000/api/user"), "/api/user");
    const text = await res.text();
    expect(res.status).toBe(503);
    expect(JSON.parse(text)).toMatchObject({ success: false, code: "backend_unreachable" });
    expect(text).not.toContain("10.0.0.5");
  });
});
