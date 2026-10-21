'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { REACTIONS, type DemoReactions, type Reaction } from './reactions';

const TABS = [
  {
    href: '/demo',
    label: 'Feed',
    match: (p: string) => p === '/demo' || p.startsWith('/demo/run/'),
    icon: <path d="M4 5h16M4 12h16M4 19h10" strokeWidth="2.2" strokeLinecap="round" fill="none" />,
  },
  {
    href: '/demo/standings',
    label: 'Leaderboard',
    match: (p: string) => p.startsWith('/demo/standings') || p.startsWith('/demo/runner/'),
    icon: (
      <path d="M5 20v-7M12 20V5M19 20v-10" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    ),
  },
  {
    href: '/demo/week/3',
    label: 'Duels',
    match: (p: string) => p.startsWith('/demo/week/'),
    icon: (
      <path
        d="M5 5l14 14M19 5L5 19M4 15l5 5M15 4l5 5"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
    ),
  },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Demo sections">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={active ? 'tabbar-item active' : 'tabbar-item'}
            aria-current={active ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" aria-hidden>
              {tab.icon}
            </svg>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Reactions({ initial, names }: { initial: DemoReactions; names: string[] }) {
  const [mine, setMine] = useState<Reaction | null>(null);
  const others = names.length;
  return (
    <div className="reactions">
      <div className="reaction-buttons">
        {REACTIONS.map((r) => {
          const count = initial.counts[r] + (mine === r ? 1 : 0);
          return (
            <button
              key={r}
              type="button"
              className={mine === r ? 'reaction active' : 'reaction'}
              aria-pressed={mine === r}
              onClick={(e) => {
                e.preventDefault();
                setMine(mine === r ? null : r);
              }}
            >
              <span aria-hidden>{r}</span>
              {count > 0 && <span className="reaction-count">{count}</span>}
            </button>
          );
        })}
      </div>
      {others > 0 && (
        <span className="reaction-by">
          {names[0]}
          {others > 1 ? ` +${others - 1}` : ''}
        </span>
      )}
    </div>
  );
}
