import type { ReactNode } from "react";

import { Notice } from "@vitrio/ui";

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

export function PanelFeedback({
  loading,
  error,
  onRetry,
  empty,
  emptyTitle,
  emptyText,
}: {
  loading: boolean;
  error: string;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyText?: string;
}) {
  if (loading) return <Notice tone="loading" title="Carregando" text="Buscando os dados da loja." />;
  if (error) {
    return (
      <Notice
        tone="error"
        title="Não foi possível carregar"
        text={error}
        action={
          onRetry ? (
            <button type="button" className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" onClick={onRetry}>
              Tentar de novo
            </button>
          ) : undefined
        }
      />
    );
  }
  if (empty && emptyTitle) return <Notice tone="empty" title={emptyTitle} text={emptyText} />;
  return null;
}
