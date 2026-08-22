import { unsubscribeFromPush } from "@/lib/push";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { QueryClient } from "@tanstack/react-query";

/**
 * The only logout. It replaces four near-copies that had already drifted apart.
 *
 * The order is not incidental: unsubscribeFromPush calls the API, which needs a
 * valid token, so it has to run before the session goes away — never after.
 */
export async function signOut(queryClient: QueryClient): Promise<void> {
  await unsubscribeFromPush().catch(() => undefined);

  // scope "local" — the default is "global", which would revoke the session on
  // every device: signing out on the kitchen tablet would sign the same person
  // out on their phone.
  await getSupabaseBrowserClient().auth.signOut({ scope: "local" });

  queryClient.clear();
}
