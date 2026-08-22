import { createBrowserClient } from "@supabase/ssr";

/**
 * One client per browser, deliberately.
 *
 * A second instance would run its own refresh timer, and with refresh token
 * rotation on, the two would race to rotate the same token — the loser ends up
 * holding a revoked one and the user is signed out for no visible reason.
 *
 * createBrowserClient (from @supabase/ssr, not supabase-js directly) keeps the
 * session in cookies rather than localStorage, which is what lets the Next
 * middleware see it at all.
 */
let client: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias",
      );
    }

    client = createBrowserClient(url, anonKey);
  }

  return client;
}
