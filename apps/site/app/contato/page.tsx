import type { Metadata } from "next";

import { ContactLink } from "@/components/contact-link";
import { StorePage } from "@/components/store-page";
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
  const rows = [
    ["Endereço", tenant.address],
    ["Horário", tenant.business_hours],
    ["Telefone", tenant.phone],
    ["Instagram", tenant.instagram],
  ].filter((row): row is [string, string] => Boolean(row[1]));
  return (
    <StorePage crumb="Contato" title="Contato" lede="O pedido segue direto com a loja, pelo canal que ela escolheu.">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-[var(--surface)] p-7">
          <h2 className="font-serif text-[28px]">Fale com a loja</h2>
          <dl className="mt-4 grid gap-4 text-[var(--ink)]">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-[var(--muted)]">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-2xl bg-[var(--surface)] p-7">
          <h2 className="text-[22px]">Atendimento</h2>
          <p className="mt-2 text-[var(--muted)]">Envie uma mensagem e a equipe responde no canal configurado.</p>
          <div className="mt-6">
            <ContactLink contact={tenant.contact} message="Olá! Vim pelo site e gostaria de mais informações." />
          </div>
        </section>
      </div>
    </StorePage>
  );
}
