import type { ReactNode } from "react";

export function PanelPage({ title, lede, children }: { title: string; lede?: string; children: ReactNode }) {
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">{title}</h1>
      {lede ? <p className="text-base text-[var(--muted)]">{lede}</p> : null}
      {children}
    </main>
  );
}

export function PanelCard({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
      {title ? <h2 className="text-[22px]">{title}</h2> : null}
      {children}
    </section>
  );
}

export function PanelList({ children, empty }: { children: ReactNode; empty?: ReactNode }) {
  return <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">{children || empty}</ul>;
}
