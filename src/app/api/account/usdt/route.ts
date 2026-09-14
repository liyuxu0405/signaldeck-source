import { NextRequest, NextResponse } from "next/server";
import { emailFromRequest } from "@/lib/auth";
import { workerSecret } from "@/lib/runtime-env";
import { settleOneApplication } from "@/lib/usdt-settle";
import { DEFAULT_USDT_RECEIVE_ADDRESS, validEvmAddress } from "@/lib/usdt";

export const runtime = "nodejs";

async function payConfig() {
  const configured = await workerSecret("USDT_ERC20_ADDRESS");
  const address = validEvmAddress(configured) ? configured : DEFAULT_USDT_RECEIVE_ADDRESS;
  const apiKey = await workerSecret("ETHERSCAN_API_KEY");
  return { address, apiKey };
}

export async function POST(request: NextRequest) {
  const email = await emailFromRequest(request);
  if (!email) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "缺少申请" }, { status: 400 });
  const { address, apiKey } = await payConfig();
  try {
    const result = await settleOneApplication(body.id, email, address, apiKey);
    if ("error" in result && result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    if (!result.matched && !result.already) {
      return NextResponse.json({ application: result.application, error: "尚未检测到对应金额的 USDT 入账" }, { status: 409 });
    }
    return NextResponse.json({ application: result.application, already: result.already });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "链上查询失败" }, { status: 502 });
  }
}

export async function GET() {
  const configured = await workerSecret("USDT_ERC20_ADDRESS");
  const address = validEvmAddress(configured) ? configured : DEFAULT_USDT_RECEIVE_ADDRESS;
  return NextResponse.json({
    network: "Ethereum ERC-20",
    token: "USDT",
    address,
    configured: validEvmAddress(address),
  });
}
