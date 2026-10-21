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
    icon: <path d="M4 6h16M4 12h16M4 18h10" />,
  },
  {
    href: '/demo/standings',
    label: 'Standings',
    match: (p: string) => p.startsWith('/demo/standings') || p.startsWith('/demo/runner/'),
    icon: <path d="M6 20V11M12 20V4M18 20v-6" />,
  },
  {
    href: '/demo/week/3',
    label: 'Duels',
    match: (p: string) => p.startsWith('/demo/week/'),
    icon: <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8z" />,
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
