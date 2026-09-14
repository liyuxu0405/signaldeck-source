import { describe, expect, it } from "vitest";
import {
  catalogStations,
  findCatalogStation,
  filterCatalogStations,
  stationSlug,
} from "./catalog";

describe("中转站种子目录", () => {
  it("只包含中转站并明确来源，不把外部结果当本站分数", () => {
    expect(catalogStations.length).toBeGreaterThanOrEqual(40);
    for (const station of catalogStations) {
      expect(station.kind).toBe("relay");
      expect(station.sourceUrl).toMatch(/^https:\/\//);
      expect(station).not.toHaveProperty("score");
      expect(station).not.toHaveProperty("uptime");
    }
  });

  it("按协议筛选且可以通过稳定 slug 找到站点", () => {
    const claude = filterCatalogStations({ protocol: "anthropic" });
    expect(claude.length).toBeGreaterThan(5);
    expect(claude.every((station) => station.protocols.includes("anthropic"))).toBe(true);
    const station = claude[0];
    expect(findCatalogStation(stationSlug(station.domain))?.domain).toBe(station.domain);
  });

  it("按域名或名称搜索", () => {
    expect(filterCatalogStations({ query: "omniakey" }).some((item) => item.domain === "omniakey.com")).toBe(true);
    expect(filterCatalogStations({ query: "公开目录" }).length).toBeGreaterThan(10);
  });

  it("API 域名可以解析为真实品牌名和官网", () => {
    const station = findCatalogStation("api-cheaperinference-com");
    expect(station?.name).toBe("Cheaper Inference");
    expect(station?.websiteUrl).toBe("https://www.cheaperinference.com/");
    expect(station?.endpoint).toBe("https://api.cheaperinference.com");
    expect(station?.logoUrl).toBe("/station-logos/api-cheaperinference-com.svg");
  });

  it("官网域名预填 api. 子域，已是 api. 的不再重复", () => {
    expect(findCatalogStation("omniakey-com")?.endpoint).toBe("https://api.omniakey.com");
    expect(findCatalogStation("wawazz-xyz")?.endpoint).toBe("https://api.wawazz.xyz");
    expect(findCatalogStation("passion8-cc")?.endpoint).toBe("https://api.passion8.cc");
    expect(findCatalogStation("api-cheaperinference-com")?.endpoint).toBe("https://api.cheaperinference.com");
  });

  it("每个中转站都保存可直接带入检测的 HTTPS 根地址", () => {
    for (const station of catalogStations) {
      expect(station.endpoint).toMatch(/^https:\/\//);
      const apiHost = new URL(station.endpoint!).hostname;
      expect(apiHost.startsWith("api.")).toBe(true);
      if (station.domain.startsWith("api.")) expect(apiHost).toBe(station.domain);
      else expect(apiHost).toBe(`api.${station.domain}`);
    }
  });

  it("已抓取的站点使用真实名称、官网和本地 Logo", () => {
    expect(catalogStations.filter((station) => station.logoUrl).length).toBeGreaterThanOrEqual(40);
    expect(catalogStations.find((station) => station.domain === "api.koozhan.com")).toMatchObject({
      name: "酷站AI",
      websiteUrl: "https://koozhan.com/",
    });
  });
});
