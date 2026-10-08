import Link from "next/link";

export function EmptyCatalog({ title, text, action = "Ver catálogo" }: { title: string; text: string; action?: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface)] px-8 py-14 text-center">
      <p className="font-serif text-3xl">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-[var(--muted)]">{text}</p>
      <Link href="/produtos" className="mt-6 inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]">
        {action}
      </Link>
    </div>
  );
}
