'use client';

import { useState } from 'react';

export function CopyButton({ text, label = 'Copy link' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState('copied');
        } catch {
          setState('failed');
        }
        setTimeout(() => setState('idle'), 2500);
      }}
    >
      {state === 'copied'
        ? 'Copied'
        : state === 'failed'
          ? 'Press and hold the link to copy'
          : label}
    </button>
  );
}
