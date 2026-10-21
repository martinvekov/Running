'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { DemoKudos } from './reactions';

const TABS = [
  {
    href: '/demo',
    label: 'Feed',
    match: (p: string) => p === '/demo' || p.startsWith('/demo/run/'),
    icon: <path d="M4 5h16M4 12h16M4 19h10" strokeWidth="1.8" strokeLinecap="round" fill="none" />,
  },
  {
    href: '/demo/standings',
    label: 'Leaderboard',
    match: (p: string) => p.startsWith('/demo/standings') || p.startsWith('/demo/runner/'),
    icon: (
      <path d="M5 20v-7M12 20V5M19 20v-10" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    ),
  },
  {
    href: '/demo/week/3',
    label: 'Duels',
    match: (p: string) => p.startsWith('/demo/week/'),
    icon: (
      <path
        d="M5 5l14 14M19 5L5 19M4 15l5 5M15 4l5 5"
        strokeWidth="1.8"
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

export function Kudos({ initial, names }: { initial: DemoKudos; names: string[] }) {
  const [given, setGiven] = useState(false);
  const count = initial.count + (given ? 1 : 0);
  const who = given ? ['You', ...names] : names;
  return (
    <div className="kudos">
      <button
        type="button"
        className={given ? 'kudos-button active' : 'kudos-button'}
        aria-pressed={given}
        onClick={(e) => {
          e.preventDefault();
          setGiven(!given);
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"
            fill={given ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
        <span>Kudos</span>
      </button>
      {count > 0 && (
        <span className="kudos-by">
          {who[0]}
          {count > 1 ? ` and ${count - 1} other${count === 2 ? '' : 's'}` : ''}
        </span>
      )}
    </div>
  );
}
