import type { ReactNode } from 'react';
import { TabBar } from '../_season/client';

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <TabBar base="/demo" duelsWeek={3} />
    </>
  );
}
