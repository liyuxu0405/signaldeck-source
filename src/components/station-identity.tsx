import Image from "next/image";

export function StationIdentity({ name, domain, logoUrl, compact = false }: { name: string; domain?: string; logoUrl?: string; compact?: boolean }) {
  const size = compact ? 36 : 44;
  return (
    <span className="flex min-w-0 items-center gap-3">
      {logoUrl ? (
        <Image src={logoUrl} alt={`${name} Logo`} width={size} height={size} className="shrink-0 rounded-xl object-contain" />
      ) : (
        <span className={`${compact ? "size-9" : "size-11"} grid shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500`} aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
      )}
      <span className="min-w-0">
        <strong className="block truncate">{name}</strong>
        {domain && <span className="mt-1 block truncate font-mono text-xs font-normal text-slate-500">{domain}</span>}
      </span>
    </span>
  );
}
