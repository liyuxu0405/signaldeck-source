import { AdBanner } from "@/components/ad-slot";
import { FeaturedListings } from "@/components/featured-listings";
import { PaidTopTen, SponsorBoard } from "@/components/paid-inventory";
import { LiveDashboard } from "@/components/live-dashboard";
import { adsFor, featuredListings } from "@/lib/marketplace";
import type { Protocol } from "@/lib/detection";
import { approvedOperatorListings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ endpoint?: string; protocol?: string }>;
}) {
  const extras = await approvedOperatorListings();
  const query = await searchParams;
  const endpoint = query.endpoint && /^https:\/\//.test(query.endpoint) ? query.endpoint : "";
  const protocol = query.protocol === "anthropic" || query.protocol === "gemini" || query.protocol === "openai"
    ? query.protocol as Protocol
    : undefined;
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <AdBanner ad={adsFor("home-top")[0]} />
      </div>
      <LiveDashboard initialBaseUrl={endpoint} initialProtocol={protocol} />
      <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 sm:px-6">
        <AdBanner ad={adsFor("home-mid")[0]} />
        <SponsorBoard />
        <PaidTopTen />
        <FeaturedListings listings={featuredListings(extras)} />
      </div>
    </>
  );
}
