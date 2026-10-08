import Link from "next/link";

export function EmptyCatalog({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-8 rounded-[1.5rem] bg-white px-8 py-14 text-center ring-1 ring-stone-200/80">
      <p className="font-serif text-3xl">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-stone-600">{text}</p>
      <Link href="/produtos" className="mt-6 inline-flex rounded-full px-5 py-3 text-sm font-medium text-white" style={{ background: "var(--store)" }}>
        Ver produtos
      </Link>
    </div>
  );
}
