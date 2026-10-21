import type { ReactNode } from 'react';
import { TabBar } from './_lib/client';

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <TabBar />
    </>
  );
}
