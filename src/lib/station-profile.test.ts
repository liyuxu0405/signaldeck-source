import { describe, expect, it } from "vitest";
import { discoverStationProfile } from "./station-profile";

describe("新中转站资料发现", () => {
  it("从 API 子域名回退到主站并抓取名称与同源 Logo", async () => {
    const responses = new Map([
      ["https://api.example.com/", new Response("{}", { headers: { "content-type": "application/json" } })],
      ["https://example.com/", new Response('<html><head><title>Example AI - API Gateway</title><link rel="icon" href="/logo.png"></head></html>', { headers: { "content-type": "text/html" } })],
      ["https://example.com/logo.png", new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "content-type": "image/png" } })],
    ]);
    const fetcher: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const response = responses.get(url);
      if (!response) throw new Error(`unexpected ${url}`);
      return response;
    };
    const profile = await discoverStationProfile("https://api.example.com", fetcher);
    expect(profile).toMatchObject({ host: "api.example.com", name: "Example AI", websiteUrl: "https://example.com/", logoContentType: "image/png" });
    expect(profile?.logoBase64).toBe("iVBORw==");
  });

  it("拒绝跨站 Logo 和不安全协议", async () => {
    const fetcher: typeof fetch = async () => new Response('<title>Safe Relay</title><link rel="icon" href="https://tracker.invalid/icon.png">', { headers: { "content-type": "text/html" } });
    const profile = await discoverStationProfile("https://relay.example.com", fetcher);
    expect(profile?.name).toBe("Safe Relay");
    expect(profile?.logoBase64).toBeUndefined();
    await expect(discoverStationProfile("http://relay.example.com", fetcher)).rejects.toThrow("HTTPS");
  });
});
