'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

/** A submit button that shows it is working, so a slow action never looks like a dead button. */
export function SubmitButton({
  children,
  pending,
  className = 'btn-primary',
}: {
  children: ReactNode;
  pending: string;
  className?: string;
}) {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={status.pending}
      aria-busy={status.pending}
    >
      {status.pending ? pending : children}
    </button>
  );
}
