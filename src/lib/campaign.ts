export type CampaignKind = "banner" | "sponsor" | "paid-rank" | "featured" | "pro" | "affiliate";
export type CampaignStatus = "active" | "paused";

export type CampaignRecord = {
  id: string;
  applicationId?: string;
  kind: CampaignKind;
  placementIds: string[];
  name: string;
  destinationUrl: string;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

const idPattern = /^[a-z0-9][a-z0-9._-]{1,79}$/;

export function validateCampaign(campaign: CampaignRecord) {
  if (!idPattern.test(campaign.id) || !campaign.name.trim() || campaign.name.length > 100) throw new Error("活动标识或名称无效");
  if (campaign.placementIds.length === 0 || campaign.placementIds.some((id) => !idPattern.test(id))) throw new Error("广告位置无效");
  const destination = new URL(campaign.destinationUrl);
  if (destination.protocol !== "https:") throw new Error("活动落地页必须使用 HTTPS");
  const starts = Date.parse(campaign.startsAt);
  const ends = Date.parse(campaign.endsAt);
  if (!Number.isFinite(starts) || !Number.isFinite(ends) || starts >= ends) throw new Error("活动日期无效");
  if (!Number.isFinite(Date.parse(campaign.createdAt))) throw new Error("创建时间无效");
  return { ...campaign, name: campaign.name.trim(), destinationUrl: destination.toString() };
}

export function campaignIsActive(campaign: CampaignRecord, now = Date.now()) {
  return campaign.status === "active" && Date.parse(campaign.startsAt) <= now && Date.parse(campaign.endsAt) >= now;
}
