// Worker bọc lại đúng logic của functions/api/chat.js, thêm CORS để landing gọi sang.
import { onRequestPost } from "../functions/api/chat.js";

const ALLOWED_ORIGINS = ["https://ketoanthue.wifinance.com.vn", "https://hieu-thue-dung-2-buoi.pages.dev", "http://localhost:8788", "http://127.0.0.1:8788"];

function corsHeaders(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[\w-]+\.hieu-thue-dung-2-buoi\.pages\.dev$/.test(origin);
  if (!ok) return null;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request.headers.get("origin") || "");
    if (request.method === "OPTIONS") return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    if (request.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { "content-type": "application/json" } });

    const res = await onRequestPost({ request, env });
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors || {})) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  },
};
