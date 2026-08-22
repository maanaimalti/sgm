import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * The second — and only other — server-side Supabase client in this app.
 *
 * `lib/supabase/middleware.ts` builds its own because middleware has to hand
 * cookies back on a NextResponse it also owns. This one is for Route Handlers,
 * where `cookies()` from next/headers is writable and the redirect that
 * follows carries whatever was written.
 */
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}
