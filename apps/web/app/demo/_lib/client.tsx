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
  },
  {
    href: '/demo/standings',
    label: 'Standings',
    match: (p: string) => p.startsWith('/demo/standings') || p.startsWith('/demo/runner/'),
  },
  {
    href: '/demo/week/3',
    label: 'Duels',
    match: (p: string) => p.startsWith('/demo/week/'),
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
            {tab.label}
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
        Kudos{count > 0 ? ` ${count}` : ''}
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
