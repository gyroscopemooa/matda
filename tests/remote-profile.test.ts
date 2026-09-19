import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";
import type { User } from "../src/lib/types";
import {
  applyRemoteProfile,
  persistRemoteProfile,
} from "../src/lib/remote-profile";

const local = (): User => ({
  id: "local",
  supabaseId: "remote",
  name: "이웃",
  email: "test@example.test",
  password: "unused",
  role: "customer",
  region: "",
  createdAt: "",
});
test("Remote presentation cannot grant roles and preserves local-only photos", () => {
  const user = local();
  user.avatar = "media:photo";
  applyRemoteProfile(user, {
    user_metadata: {
      haejyo_profile: {
        name: "새 이웃",
        region: "울산광역시",
        avatar: "leaf",
        role: "admin",
      },
    },
  } as unknown as AuthUser);
  assert.equal(user.name, "새 이웃");
  assert.equal(user.role, "customer");
  assert.equal(user.avatar, "media:photo");
});
test("Remote profile writes require the bound authenticated identity", async () => {
  let writes = 0;
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "other" } } }),
      updateUser: async () => {
        writes++;
        return {};
      },
    },
  } as unknown as SupabaseClient;
  await assert.rejects(() => persistRemoteProfile(client, local()));
  assert.equal(writes, 0);
});
