import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-5 py-8 md:px-16 md:py-16">
      <p className="text-[13px] text-[var(--muted)]">Início / Não encontrado</p>
      <h1 className="font-serif text-5xl leading-none">Esse conteúdo não está publicado</h1>
      <p className="font-serif text-7xl text-[var(--brand)]">404</p>
      <p className="text-[var(--muted)]">Volte ao catálogo para descobrir outros produtos.</p>
      <Link href="/produtos" className="inline-flex min-h-11 w-fit items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]">
        Ver catálogo
      </Link>
    </main>
  );
}
