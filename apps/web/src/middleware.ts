import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Note: `auth` is NOT excluded here, so /auth/confirm runs through the
    // middleware. decideRedirect allowlists it — that pairing is what keeps
    // invite links working.
    // Everything except Next internals, the /api proxy, and the static files
    // the PWA fetches. The previous matcher excluded only logo.png, so /sw.js
    // and the manifest icons were being redirected to "/" — the service worker
    // never registered and the install icon never loaded.
    "/((?!_next/static|_next/image|favicon.ico|api|sw\\.js|site\\.webmanifest|.*\\.(?:png|svg|ico|jpg|jpeg|gif|webp)$).*)",
  ],
};
