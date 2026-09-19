import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";
import type { User } from "./types";
import { AppError } from "./types";

// Personal presentation only. Never derive permissions from editable metadata.
export function applyRemoteProfile(local: User, identity: AuthUser) {
  const profile = identity.user_metadata.haejyo_profile;
  if (!profile || typeof profile !== "object") return;
  if (
    typeof profile.name === "string" &&
    profile.name.trim().length <= 20 &&
    profile.name.trim()
  )
    local.name = profile.name.trim();
  if (typeof profile.region === "string") local.region = profile.region;
  if (["sun", "leaf", "smile"].includes(profile.avatar)) {
    // Uploaded photos are still local until the storage migration.
    if (!local.avatar?.startsWith("media:")) local.avatar = profile.avatar;
  }
}

export async function persistRemoteProfile(client: SupabaseClient, user: User) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || data.user.id !== user.supabaseId)
    throw new AppError("Google로 다시 로그인한 뒤 프로필을 저장해주세요.", 401);
  const { error: saveError } = await client.auth.updateUser({
    data: {
      haejyo_profile: {
        name: user.name,
        region: user.region,
        avatar: ["sun", "leaf", "smile"].includes(user.avatar || "")
          ? user.avatar
          : "sun",
      },
    },
  });
  if (saveError)
    throw new AppError(
      "프로필을 서버에 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
      503,
    );
}
