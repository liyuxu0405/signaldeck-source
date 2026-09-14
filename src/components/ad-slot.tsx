import Link from "next/link";
import { CommercialLink } from "@/components/commercial-link";
import type { AdSlot } from "@/lib/marketplace";

export function AdBanner({ ad }: { ad?: AdSlot }) {
  if (!ad) return null;
  if (ad.vacant || !ad.href) {
    return (
      <Link
        href="/business#inventory"
        className="block rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-4 text-center transition hover:bg-emerald-50"
      >
        <div className="text-xs font-medium uppercase tracking-wide text-emerald-800">广告位 {ad.id} · {ad.label}</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">此位置招租，点击查看套餐</div>
      </Link>
    );
  }
  return (
    <CommercialLink
      campaignId={ad.id}
      placementId={ad.placement}
      className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm transition hover:border-emerald-300"
    >
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">赞助 · {ad.id}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{ad.headline ?? ad.partner}</div>
    </CommercialLink>
  );
}
