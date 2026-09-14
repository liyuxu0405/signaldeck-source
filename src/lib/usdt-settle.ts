import { claimUsdtTx, listApplications, readApplication, saveApplication, type ListingApplication } from "./store";
import { fetchIncomingUsdt, findMatchingTransfer, uniqueUsdtQuote } from "./usdt";

export async function ensureUsdtQuote(app: ListingApplication) {
  if (app.usdtAmount && app.usdtMicro) return app;
  const quote = uniqueUsdtQuote(app.packageId, app.id);
  const next = { ...app, usdtAmount: quote.display, usdtMicro: quote.micro };
  await saveApplication(next);
  return next;
}

export async function settleUsdtApplications(options: {
  receiveAddress: string;
  apiKey?: string;
  onlyId?: string;
  email?: string;
}) {
  const apps = await listApplications(options.email);
  const pending = apps.filter((item) => item.status !== "rejected" && item.status !== "approved" && !item.paidAt);
  const targets = options.onlyId ? pending.filter((item) => item.id === options.onlyId) : pending;
  if (targets.length === 0) return { settled: [] as ListingApplication[], checked: 0 };

  const transfers = await fetchIncomingUsdt(options.receiveAddress, options.apiKey);
  const settled: ListingApplication[] = [];
  for (const raw of targets) {
    const app = await ensureUsdtQuote(raw);
    const hit = findMatchingTransfer(transfers, options.receiveAddress, app.usdtMicro!);
    if (!hit) continue;
    if (!await claimUsdtTx(hit.transaction_id, app.id)) continue;
    const live: ListingApplication = {
      ...app,
      paidAt: new Date().toISOString(),
      usdtTxHash: hit.transaction_id,
      status: "approved",
    };
    await saveApplication(live);
    settled.push(live);
  }
  return { settled, checked: targets.length };
}

export async function settleOneApplication(id: string, email: string, receiveAddress: string, apiKey?: string) {
  const current = await readApplication(id);
  if (!current || current.email !== email) return { error: "申请不存在", status: 404 as const };
  if (current.status === "rejected") return { error: "申请已拒绝", status: 409 as const };
  if (current.paidAt && current.status === "approved") return { application: current, already: true };
  const result = await settleUsdtApplications({ receiveAddress, apiKey, onlyId: id, email });
  const application = result.settled[0] ?? await readApplication(id);
  return { application, already: false, matched: result.settled.length > 0 };
}
