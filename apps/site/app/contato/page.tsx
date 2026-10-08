import type { Metadata } from "next";

import { ContactLink } from "@/components/contact-link";
import { getSite, requestOrigin } from "@/lib/api";
import { seoMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  if (!site) return { title: "Contato" };
  const { origin } = await requestOrigin();
  return seoMetadata({ ...site.tenant.seo, title: `Contato · ${site.tenant.trade_name}` }, "/contato", origin);
}

export default async function ContactPage() {
  const site = await getSite();
  if (!site) return <main className="p-8">Loja não encontrada</main>;
  const tenant = site.tenant;
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-5 py-8 md:px-16 md:py-16">
      <h1 className="font-serif text-5xl leading-none">Contato</h1>
      <p className="max-w-xl text-[var(--muted)]">O pedido segue direto com a loja, pelo canal que ela escolheu.</p>
      <dl className="mt-8 space-y-3 text-stone-700">
        {tenant.address ? <div><dt className="text-sm text-stone-500">Endereço</dt><dd>{tenant.address}</dd></div> : null}
        {tenant.business_hours ? <div><dt className="text-sm text-stone-500">Horário</dt><dd>{tenant.business_hours}</dd></div> : null}
        {tenant.phone ? <div><dt className="text-sm text-stone-500">Telefone</dt><dd>{tenant.phone}</dd></div> : null}
        {tenant.instagram ? <div><dt className="text-sm text-stone-500">Instagram</dt><dd>{tenant.instagram}</dd></div> : null}
      </dl>
      <div className="mt-8">
        <ContactLink contact={tenant.contact} message="Olá! Vim pelo site e gostaria de mais informações." />
      </div>
    </main>
  );
}
