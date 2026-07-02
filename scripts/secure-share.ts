/**
 * secure-share — password-protected gateway for sharing the Vantage demo.
 *
 * Sits in front of the app (dev server or production preview) and enforces
 * HTTP Basic Auth on every request, then proxies through. Expose the gateway
 * (not the app) via a tunnel to get a private, shareable HTTPS link.
 *
 * Run:   bun scripts/secure-share.ts
 * Env:   SHARE_PASSWORD  required — the password visitors must enter
 *        SHARE_TARGET    upstream app (default http://localhost:4173)
 *        SHARE_PORT      gateway port (default 8090)
 *
 * Bun auto-loads .env.local, so SHARE_PASSWORD normally lives there
 * (git-ignored — the password is never committed).
 */

const PASSWORD = process.env.SHARE_PASSWORD;
const TARGET = process.env.SHARE_TARGET ?? "http://localhost:4173";
const PORT = Number(process.env.SHARE_PORT ?? 8090);

if (!PASSWORD) {
  console.error("[secure-share] SHARE_PASSWORD is not set — refusing to start an open gateway.");
  process.exit(1);
}

const targetHost = new URL(TARGET).host;

function authorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    // Any username is accepted; only the password is checked.
    const pass = decoded.slice(decoded.indexOf(":") + 1);
    return pass === PASSWORD;
  } catch {
    return false;
  }
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    if (!authorized(req)) {
      return new Response("Vantage demo — authentication required.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Vantage Demo"' },
      });
    }
    const url = new URL(req.url);
    const upstream = new URL(url.pathname + url.search, TARGET);
    const headers = new Headers(req.headers);
    headers.set("host", targetHost);
    headers.delete("accept-encoding"); // upstream re-compression causes body mismatches
    const res = await fetch(upstream, {
      method: req.method,
      headers,
      body: req.body,
      redirect: "manual",
    });
    const out = new Headers(res.headers);
    out.delete("content-encoding");
    out.delete("content-length");
    return new Response(res.body, { status: res.status, headers: out });
  },
});

console.log(`[secure-share] gateway listening on http://localhost:${PORT} → ${TARGET}`);
console.log("[secure-share] every request requires Basic Auth (any username + the shared password)");
