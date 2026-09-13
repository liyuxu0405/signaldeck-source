export type AdPlacement = "home-top" | "home-mid" | "directory-top" | "report-side";

export type AdSlot = {
  id: string;
  placement: AdPlacement;
  label: string;
  vacant: boolean;
  partner?: string;
  headline?: string;
  href?: string;
};

export type Listing = {
  id: string;
  name: string;
  domain: string;
  summary: string;
  href: string;
  featured: boolean;
  paid: true;
};

export type Affiliate = {
  slug: string;
  name: string;
  url: string;
};

export type CommercialPackage = {
  id: string;
  name: string;
  price: string;
  audience: string;
  perks: string[];
};

export const businessContact = {
  email: "Liyuxu04050707@gmail.com",
  github: "https://github.com/liyuxu0405/signaldeck-source",
};

/** 付费只买位置。分数只来自公开检测报告。 */
export const monetizationPolicy =
  "付费只购买展示位置与跳转，不购买检测分数、不改判定、不上榜作假。";

export const ads: AdSlot[] = [
  { id: "H1", placement: "home-top", label: "首页顶栏横幅", vacant: true },
  { id: "H2", placement: "home-mid", label: "检测区下方横幅", vacant: true },
  { id: "D1", placement: "directory-top", label: "收录页顶栏横幅", vacant: true },
  { id: "R1", placement: "report-side", label: "报告页侧栏", vacant: true },
];

export const listings: Listing[] = [];

export const affiliates: Affiliate[] = [];

export const packages: CommercialPackage[] = [
  {
    id: "banner",
    name: "展示广告",
    price: "¥299 / 月起",
    audience: "需要立刻出现在检测页流量上的中转站",
    perks: ["首页 / 收录页固定横幅", "可带跳转与品牌名", "空位先到先得"],
  },
  {
    id: "featured",
    name: "精选收录",
    price: "¥999 / 年起",
    audience: "希望长期出现在导航与收录页的服务商",
    perks: ["收录页置顶展示", "官网入口与简介", "标注为付费精选，分数仍只来自公开报告"],
  },
  {
    id: "sponsor",
    name: "模型组赞助",
    price: "¥199 / 月起",
    audience: "主打某个热门模型的接口",
    perks: ["在对应模型分组旁展示", "与检测入口相邻", "不改变该项检测权重"],
  },
  {
    id: "affiliate",
    name: "联盟分销",
    price: "CPS 协商",
    audience: "有注册/充值转化的平台",
    perks: ["统一走 /go/{slug} 跳转", "可统计点击", "落地页与佣金比例书面约定"],
  },
];

export function adsFor(placement: AdPlacement) {
  return ads.filter((ad) => ad.placement === placement);
}

export function featuredListings() {
  return listings.filter((item) => item.featured);
}

export function getAffiliate(slug: string) {
  const partner = affiliates.find((item) => item.slug === slug);
  if (!partner) return undefined;
  let url: URL;
  try {
    url = new URL(partner.url);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:") return undefined;
  return partner;
}

export function inventorySummary() {
  const vacantAds = ads.filter((ad) => ad.vacant).length;
  return {
    adSlots: ads.length,
    vacantAds,
    soldAds: ads.length - vacantAds,
    featured: featuredListings().length,
    affiliates: affiliates.length,
  };
}
