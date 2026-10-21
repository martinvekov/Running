'use client';

import { useOptimistic } from 'react';

/** A like that flips the instant it is tapped, then settles when the server answers. */
export function LikeButton({
  crewId,
  activityId,
  liked,
  count,
  action,
}: {
  crewId: string;
  activityId: string;
  liked: boolean;
  count: number;
  action: (formData: FormData) => Promise<void>;
}) {
  const [state, flip] = useOptimistic({ liked, count }, (s) => ({
    liked: !s.liked,
    count: s.count + (s.liked ? -1 : 1),
  }));
  return (
    <form
      action={async (formData) => {
        flip(undefined);
        await action(formData);
      }}
    >
      <input type="hidden" name="crewId" value={crewId} />
      <input type="hidden" name="activityId" value={activityId} />
      <button
        type="submit"
        className={state.liked ? 'social-btn liked' : 'social-btn'}
        aria-pressed={state.liked}
        aria-label={state.liked ? 'Remove your like' : 'Like this run'}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path
            d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"
            fill={state.liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        {state.count > 0 && <span>{state.count}</span>}
      </button>
    </form>
  );
}
