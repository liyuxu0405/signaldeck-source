import { AdBanner } from "@/components/ad-slot";
import { FeaturedListings } from "@/components/featured-listings";
import { LiveDashboard } from "@/components/live-dashboard";
import { adsFor, featuredListings } from "@/lib/marketplace";

export default function Home() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <AdBanner ad={adsFor("home-top")[0]} />
      </div>
      <LiveDashboard />
      <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 sm:px-6">
        <AdBanner ad={adsFor("home-mid")[0]} />
        <FeaturedListings listings={featuredListings()} />
      </div>
    </>
  );
}
