'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { DemoKudos } from './reactions';

export type TabMode = 'demo' | 'season' | 'crew';

const ICONS = {
  feed: <path d="M4 6h16M4 12h16M4 18h10" />,
  standings: <path d="M6 20V11M12 20V4M18 20v-6" />,
  duels: <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8z" />,
  log: <path d="M12 5v14M5 12h14" />,
  past: <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v4l3 2" />,
  crew: (
    <path d="M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1a3.5 3.5 0 0 0-2.5-3.3" />
  ),
};

const tabs = (base: string, duelsWeek: number, mode: TabMode) => {
  const feed = {
    href: base,
    label: 'Feed',
    match: (p: string) => p === base || p.startsWith(`${base}/run/`),
    icon: ICONS.feed,
  };
  const standings = {
    href: `${base}/standings`,
    label: 'Standings',
    match: (p: string) => p.startsWith(`${base}/standings`) || p.startsWith(`${base}/runner/`),
    icon: ICONS.standings,
  };
  const duels = {
    href: `${base}/week/${duelsWeek}`,
    label: 'Duels',
    match: (p: string) => p.startsWith(`${base}/week/`),
    icon: ICONS.duels,
  };
  const log = {
    href: `${base}/log`,
    label: 'Log',
    match: (p: string) => p.startsWith(`${base}/log`),
    icon: ICONS.log,
  };
  const past = {
    href: `${base}/preseason`,
    label: 'Past',
    match: (p: string) => p.startsWith(`${base}/preseason`),
    icon: ICONS.past,
  };
  const crew = {
    href: `${base}/crew`,
    label: 'Crew',
    match: (p: string) => p.startsWith(`${base}/crew`),
    icon: ICONS.crew,
  };
  if (mode === 'demo') return [feed, standings, duels];
  if (mode === 'crew') return [crew, past];
  return [feed, standings, duels, log, past, crew];
};

export function TabBar({
  base,
  duelsWeek,
  mode = 'demo',
}: {
  base: string;
  duelsWeek: number;
  mode?: TabMode;
}) {
  const pathname = usePathname();
  const items = tabs(base, duelsWeek, mode);
  // Highlight a tab the moment it is tapped, before the next page has arrived.
  const [tapped, setTapped] = useState<{ href: string; from: string } | null>(null);
  useEffect(() => setTapped(null), [pathname]);
  return (
    <nav className={items.length > 3 ? 'tabbar many' : 'tabbar'} aria-label="Sections">
      {items.map((tab) => {
        const active =
          tapped && tapped.from === pathname ? tapped.href === tab.href : tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => setTapped({ href: tab.href, from: pathname })}
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
