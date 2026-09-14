export type DiscoveredStationProfile = {
  host: string;
  name: string;
  websiteUrl: string;
  logoContentType?: string;
  logoBase64?: string;
};

const genericTitles = new Set(["new api", "loading...", "welcome"]);

function cleanName(title: string, host: string) {
  const name = title.split(/\s+[|·–—-]\s+/)[0]?.trim();
  return name && !genericTitles.has(name.toLowerCase()) ? name.slice(0, 80) : host;
}

export async function discoverStationProfile(baseUrl: string, fetcher: typeof fetch = fetch): Promise<DiscoveredStationProfile | null> {
  const api = new URL(baseUrl);
  if (api.protocol !== "https:") throw new Error("只允许 HTTPS 中转接口");
  const host = api.hostname.toLowerCase();
  const labels = host.split(".");
  const rootHost = labels.length > 2 && /^(api|jp-api|newapi)$/.test(labels[0]) ? labels.slice(1).join(".") : host;
  const candidates = [...new Set([`https://${host}/`, `https://${rootHost}/`, `https://www.${rootHost}/`])];

  for (const candidate of candidates) {
    try {
      const response = await fetcher(candidate, { redirect: "follow", signal: AbortSignal.timeout(6_000) });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("text/html")) continue;
      const website = new URL(response.url || candidate);
      if (website.protocol !== "https:" || !website.hostname.endsWith(rootHost)) continue;
      const html = (await response.text()).slice(0, 300_000);
      const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? host;
      const iconTag = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]).find((tag) => /rel=["'][^"']*(?:icon|apple-touch-icon)/i.test(tag));
      const href = iconTag?.match(/href=["']([^"']+)/i)?.[1];
      const profile: DiscoveredStationProfile = { host, name: cleanName(title, host), websiteUrl: website.origin + "/" };
      if (!href || href.startsWith("data:")) return profile;
      const iconUrl = new URL(href, website);
      if (iconUrl.protocol !== "https:" || iconUrl.hostname !== website.hostname) return profile;
      const iconResponse = await fetcher(iconUrl, { redirect: "follow", signal: AbortSignal.timeout(6_000) });
      const iconType = iconResponse.headers.get("content-type") ?? "";
      if (!iconResponse.ok || !/^image\/(?:png|jpeg|svg\+xml|x-icon|vnd\.microsoft\.icon)/i.test(iconType)) return profile;
      const bytes = new Uint8Array(await iconResponse.arrayBuffer());
      if (bytes.length < 4 || bytes.length > 500_000) return profile;
      profile.logoContentType = iconType.split(";")[0];
      profile.logoBase64 = Buffer.from(bytes).toString("base64");
      return profile;
    } catch {
      // 尝试同一注册域下的下一个公开页面。
    }
  }
  return null;
}
