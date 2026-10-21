'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { DemoKudos } from './reactions';

const tabs = (base: string, duelsWeek: number, full: boolean) => [
  {
    href: base,
    label: 'Feed',
    match: (p: string) => p === base || p.startsWith(`${base}/run/`),
    icon: <path d="M4 6h16M4 12h16M4 18h10" />,
  },
  {
    href: `${base}/standings`,
    label: 'Standings',
    match: (p: string) => p.startsWith(`${base}/standings`) || p.startsWith(`${base}/runner/`),
    icon: <path d="M6 20V11M12 20V4M18 20v-6" />,
  },
  {
    href: `${base}/week/${duelsWeek}`,
    label: 'Duels',
    match: (p: string) => p.startsWith(`${base}/week/`),
    icon: <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8z" />,
  },
  ...(full
    ? [
        {
          href: `${base}/log`,
          label: 'Log',
          match: (p: string) => p.startsWith(`${base}/log`),
          icon: <path d="M12 5v14M5 12h14" />,
        },
        {
          href: `${base}/crew`,
          label: 'Crew',
          match: (p: string) => p.startsWith(`${base}/crew`),
          icon: (
            <path d="M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1a3.5 3.5 0 0 0-2.5-3.3" />
          ),
        },
      ]
    : []),
];

export function TabBar({
  base,
  duelsWeek,
  full = false,
}: {
  base: string;
  duelsWeek: number;
  full?: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Sections">
      {tabs(base, duelsWeek, full).map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={active ? 'tabbar-item active' : 'tabbar-item'}
            aria-current={active ? 'page' : undefined}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
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
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <path
            d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"
            fill={given ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        {count > 0 ? count : 'Kudos'}
      </button>
      {count > 0 && (
        <span className="kudos-by">
          {who.slice(0, 2).join(', ')}
          {count > 2 ? ` +${count - 2}` : ''}
        </span>
      )}
    </div>
  );
}
