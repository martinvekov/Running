import Link from 'next/link';
import { LikeButton } from '@/components/like-button';
import { SubmitButton } from '@/components/submit-button';
import { MAX_COMMENT_LENGTH, timeAgo } from '@/lib/comments';
import { NO_SOCIAL } from '@/lib/social-data';
import { addComment, deleteComment, toggleLike } from '@/app/c/[crewId]/actions';
import type { SeasonView } from './view';

/** Like and comment controls under a run, with the latest comment. Real crews only. */
export function SocialBar({
  view,
  activityId,
  showLatest = true,
}: {
  view: SeasonView;
  activityId: string;
  showLatest?: boolean;
}) {
  if (view.demo || !view.crewId) return null;
  const social = view.social.get(activityId) ?? NO_SOCIAL;
  const liked = view.meId ? social.likes.some((l) => l.userId === view.meId) : false;
  const runUrl = `${view.base}/run/${activityId}`;
  const names = social.likes
    .filter((l) => l.userId !== view.meId)
    .map((l) => l.name.split(' ')[0]!);
  const likedBy =
    social.likes.length === 0
      ? null
      : liked
        ? names.length
          ? `You, ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2}` : ''}`
          : 'You'
        : `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2}` : ''}`;
  return (
    <div className="social">
      <div className="social-row">
        <LikeButton
          crewId={view.crewId}
          activityId={activityId}
          liked={liked}
          count={social.likes.length}
          action={toggleLike}
        />
        <Link href={`${runUrl}#comments`} className="social-btn" aria-label="Comments">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path
              d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-7l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          <span>{social.commentCount > 0 ? social.commentCount : 'Comment'}</span>
        </Link>
        {likedBy && <span className="social-by">{likedBy}</span>}
      </div>
      {showLatest && social.latest && (
        <Link href={`${runUrl}#comments`} className="latest-comment">
          <p>
            <strong>{social.latest.name}</strong> {social.latest.body}
          </p>
          {social.commentCount > 1 && <small>View all {social.commentCount} comments</small>}
        </Link>
      )}
    </div>
  );
}

export interface CommentRow {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  name: string;
}

/** The full thread under a run, with a box to add to it. */
export function CommentThread({
  view,
  activityId,
  comments,
}: {
  view: SeasonView;
  activityId: string;
  comments: CommentRow[];
}) {
  if (!view.crewId) return null;
  const now = Date.now();
  return (
    <section className="section" id="comments">
      <div className="section-head">
        <span className="label">Comments</span>
        <span className="label dim">{comments.length}</span>
      </div>
      {comments.length === 0 && (
        <p className="note">No comments yet. Say something about the run.</p>
      )}
      <ul className="thread">
        {comments.map((c) => (
          <li key={c.id}>
            <span className="thread-avatar" aria-hidden>
              {c.name.slice(0, 1)}
            </span>
            <div className="thread-main">
              <p>
                <strong>{c.name}</strong> <small>{timeAgo(c.created_at, now)}</small>
              </p>
              <p className="thread-body">{c.body}</p>
            </div>
            {c.user_id === view.meId && (
              <form action={deleteComment}>
                <input type="hidden" name="crewId" value={view.crewId} />
                <input type="hidden" name="id" value={c.id} />
                <SubmitButton className="link-quiet" pending="Deleting…">
                  Delete
                </SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
      <form action={addComment} className="composer">
        <input type="hidden" name="crewId" value={view.crewId} />
        <input type="hidden" name="activityId" value={activityId} />
        <label className="field">
          <span className="sr-only">Add a comment</span>
          <input
            name="body"
            maxLength={MAX_COMMENT_LENGTH}
            placeholder="Add a comment"
            autoComplete="off"
            required
          />
        </label>
        <SubmitButton className="btn-primary" pending="Posting…">
          Post
        </SubmitButton>
      </form>
    </section>
  );
}
