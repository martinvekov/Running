import type { SupabaseClient } from '@supabase/supabase-js';

export interface RunSocial {
  likes: { userId: string; name: string }[];
  commentCount: number;
  latest: { id: string; userId: string; name: string; body: string; createdAt: string } | null;
}

export const NO_SOCIAL: RunSocial = { likes: [], commentCount: 0, latest: null };

/** Likes, comment count and latest comment for these runs, in one call. */
export async function loadRunSocial(
  supabase: SupabaseClient,
  activityIds: string[],
): Promise<Record<string, RunSocial>> {
  const ids = [...new Set(activityIds)].slice(0, 600);
  if (ids.length === 0) return {};
  const { data } = await supabase.rpc('run_social', { p_activities: ids });
  return (data ?? {}) as Record<string, RunSocial>;
}
