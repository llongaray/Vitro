type Ad = { id: string; title: string; url: string | null; position: string; image_url: string | null };

export function AdSlots({ ads, position }: { ads?: Ad[]; position: string }) {
  const items = (ads ?? []).filter((ad) => ad.position === position);
  if (!items.length) return null;
  return (
    <div className="space-y-3">
      {items.map((ad) => {
        const body = (
          <>
            {ad.image_url ? <img src={ad.image_url} alt="" className="mb-2 max-h-40 w-full rounded-xl object-cover" /> : null}
            <p className="text-sm font-medium">{ad.title}</p>
          </>
        );
        const className = "block rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200";
        return ad.url ? (
          <a key={ad.id} href={ad.url} data-testid={`ad-${position}`} className={className}>
            {body}
          </a>
        ) : (
          <div key={ad.id} data-testid={`ad-${position}`} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
