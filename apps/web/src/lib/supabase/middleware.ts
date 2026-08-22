import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const LOGIN_PATH = "/";
export const HOME_PATH = "/pedidos";

export type RedirectTarget = typeof LOGIN_PATH | typeof HOME_PATH | null;

/**
 * The routing half of the middleware, pulled out so it can be reasoned about
 * (and tested) without a NextRequest. `null` means let the request through.
 */
export function decideRedirect(
  pathname: string,
  hasSession: boolean,
): RedirectTarget {
  if (pathname === LOGIN_PATH) {
    return hasSession ? HOME_PATH : null;
  }
  return hasSession ? null : LOGIN_PATH;
}

export async function updateSession(request: NextRequest) {
  // Every cookie the client writes has to end up on the response that is
  // actually returned. This object is that response.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Nothing may run between createServerClient and this call: it is what
  // refreshes an expired token, and code in between can return early with a
  // response that never received the refreshed cookies.
  //
  // getClaims verifies locally against the project JWKS — but only while the
  // project uses asymmetric keys. With a symmetric key it silently falls back
  // to a network round-trip to /auth/v1/user on every matched request.
  const { data } = await supabase.auth.getClaims();
  const target = decideRedirect(request.nextUrl.pathname, !!data?.claims);

  if (!target) return supabaseResponse;

  const url = request.nextUrl.clone();
  url.pathname = target;
  const redirect = NextResponse.redirect(url);

  // Carry over whatever was just rotated. The official example only shows the
  // signed-out redirect, where there is nothing to preserve — but the
  // signed-in "/" → "/pedidos" hop runs on every fresh load of the root, right
  // after a refresh may have happened. Dropping those cookies here is exactly
  // the random-logout bug.
  for (const cookie of supabaseResponse.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }

  return redirect;
}
