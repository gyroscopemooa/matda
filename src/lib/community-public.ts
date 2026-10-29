import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { loadCommunity, remoteEnabled } from "./community-repository";
import { snapshot } from "./domain";
import { transact } from "./store";
import { publicCommunityPost } from "./community-content";

// Always anonymous: never put an account's private snapshot into initial HTML.
export const readPublicPosts = cache(async () => {
  const publicRows = remoteEnabled()
    ? snapshot(
        (
          await loadCommunity(
            createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
              { auth: { persistSession: false, autoRefreshToken: false } },
            ),
            null,
          )
        ).db,
      ).rows
    : await transact((db) => snapshot(db).rows);
  return publicRows.filter(publicCommunityPost);
});
