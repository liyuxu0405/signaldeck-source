import { NextRequest, NextResponse } from "next/server";
import { workerSecret } from "@/lib/runtime-env";
import { loadOkxKeys, settleUsdtApplications } from "@/lib/usdt-settle";
import { DEFAULT_USDT_RECEIVE_ADDRESS, validEvmAddress } from "@/lib/usdt";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expected = (await workerSecret("CRON_SECRET")) || (await workerSecret("ADMIN_TOKEN"));
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as { id?: string };
  const configured = await workerSecret("USDT_ERC20_ADDRESS");
  const address = validEvmAddress(configured) ? configured : DEFAULT_USDT_RECEIVE_ADDRESS;
  const keys = await loadOkxKeys();
  let settled = 0;
  let checked = 0;
  let applications: unknown[] = [];
  let settleError = "";
  try {
    const result = await settleUsdtApplications({
      receiveAddress: address,
      apiKey: await workerSecret("ETHERSCAN_API_KEY"),
      onlyId: body.id,
    });
    settled = result.settled.length;
    checked = result.checked;
    applications = result.settled;
  } catch (reason) {
    settleError = reason instanceof Error ? reason.message : "链上查询失败";
  }
  let okxBalance: { funding: string; trading: string; total: string } | undefined;
  let okxError = "";
  if (keys) {
    try {
      const { fetchOkxUsdtBalance } = await import("@/lib/okx-pay");
      okxBalance = await fetchOkxUsdtBalance(keys);
    } catch (reason) {
      okxError = reason instanceof Error ? reason.message : "欧易余额查询失败";
    }
  }
  if (settleError && settled === 0) {
    return NextResponse.json({
      error: settleError,
      settled,
      checked,
      okxConfigured: Boolean(keys),
      okxBalance,
      okxError: keys ? okxError || undefined : "未配置欧易 API",
    }, { status: 502 });
  }
  return NextResponse.json({
    settled,
    checked,
    applications,
    okxConfigured: Boolean(keys),
    okxBalance,
    okxError: keys ? okxError || undefined : "未配置欧易 API",
  });
}
