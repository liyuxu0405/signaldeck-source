import type { MetadataRoute } from "next";
import { catalogStations } from "@/lib/catalog";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://signaldeck.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages = ["", "/directory", "/reports", "/faq", "/business", "/privacy", "/terms"].map((path) => ({
    url: `${site}${path}`,
    lastModified: now,
    changeFrequency: path === "/directory" ? "daily" as const : "weekly" as const,
    priority: path === "" ? 1 : path === "/directory" ? 0.9 : 0.6,
  }));
  return [
    ...staticPages,
    ...catalogStations.map((station) => ({
      url: `${site}/stations/${station.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
