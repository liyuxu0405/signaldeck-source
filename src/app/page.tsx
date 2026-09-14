import { AdBanner } from "@/components/ad-slot";
import { FeaturedListings } from "@/components/featured-listings";
import { PaidTopTen, SponsorBoard } from "@/components/paid-inventory";
import { LiveDashboard } from "@/components/live-dashboard";
import { adsFor, featuredListings } from "@/lib/marketplace";
import { approvedOperatorListings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const extras = await approvedOperatorListings();
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <AdBanner ad={adsFor("home-top")[0]} />
      </div>
      <LiveDashboard />
      <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 sm:px-6">
        <AdBanner ad={adsFor("home-mid")[0]} />
        <SponsorBoard />
        <PaidTopTen />
        <FeaturedListings listings={featuredListings(extras)} />
      </div>
    </>
  );
}
