import { createRouteHandlerClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const SET_PASSWORD_PATH = "/definir-senha";
const LOGIN_WITH_ERROR = "/?erro=link-invalido";

/**
 * Only the two types this app sends. Anything else in the query string is
 * someone probing, not one of our mails.
 */
const ALLOWED_TYPES = new Set<EmailOtpType>(["invite", "recovery"]);

/**
 * `next` arrives from the e-mail template, which means it is attacker-shaped
 * input the moment anyone can craft a link. Only a same-origin absolute path
 * is allowed: "//evil.com" is a protocol-relative URL that a bare
 * startsWith("/") check would happily forward to.
 */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return SET_PASSWORD_PATH;
  }
  return value;
}

/**
 * Where invite and recovery mails land.
 *
 * This route exists because a server-initiated invite cannot use PKCE — the
 * browser that sends it is not the browser that opens it — so Supabase's
 * default `{{ .ConfirmationURL }}` comes back with the tokens in the URL
 * *fragment*. A fragment never reaches the server, so the middleware would
 * bounce the link to "/" before anything could read it; and `createBrowserClient`
 * is hardcoded to the PKCE flow, so it rejects a fragment session outright and
 * the person just sees a blank page.
 *
 * `verifyOtp` with a `token_hash` sidesteps all of it. It is a plain POST that
 * touches no PKCE storage, and it writes the session into cookies here on the
 * server — so by the time the redirect lands, the middleware already sees a
 * signed-in user. The templates must therefore use `{{ .TokenHash }}` and point
 * at this route.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (!tokenHash || !type || !ALLOWED_TYPES.has(type)) {
    return NextResponse.redirect(new URL(LOGIN_WITH_ERROR, request.url));
  }

  const supabase = await createRouteHandlerClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(new URL(LOGIN_WITH_ERROR, request.url));
  }

  // Redirecting rather than rendering also gets token_hash out of the address
  // bar, so a shared screenshot or a browser-history entry cannot replay it.
  return NextResponse.redirect(new URL(next, request.url));
}
