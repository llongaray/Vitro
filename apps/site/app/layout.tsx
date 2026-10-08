import type { Metadata } from "next";
import { Fraunces, Outfit, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { Suspense } from "react";

import { PublicScripts } from "@/components/public-scripts";
import { StoreFooter, StoreHeader } from "@/components/store-frame";
import { TrackPage } from "@/components/track-page";
import { getSite, requestOrigin } from "@/lib/api";
import { seoMetadata } from "@/lib/seo";

import "./globals.css";

const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif" });
const editorialSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-editorial-sans" });
const editorialSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-editorial-serif" });

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite().catch(() => null);
  if (!site) return { title: "Vitrio" };
  const { origin } = await requestOrigin();
  const verification = site.integrations?.find((item) => item.provider === "search_console")?.public_id;
  return seoMetadata(site.tenant.seo, "/", origin, verification);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite().catch(() => null);
  return (
    <html lang="pt-BR">
      <body
        className={`${sans.variable} ${serif.variable} ${editorialSans.variable} ${editorialSerif.variable} ${site?.tenant.font_pair === "editorial" ? "font-editorial" : "font-sans"} flex min-h-screen flex-col antialiased`}
        style={site ? { ["--store" as string]: site.tenant.primary_color, ["--brand" as string]: site.tenant.primary_color } : undefined}
      >
        {site ? (
          <>
            <PublicScripts integrations={site.integrations ?? []} />
            <Suspense fallback={null}>
              <TrackPage />
            </Suspense>
            <StoreHeader site={site} />
            <div id="conteudo" className="flex flex-1 flex-col">
              {children}
            </div>
            <StoreFooter site={site} />
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
