import { NextRequest, NextResponse } from "next/server";
import { emailFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const email = await emailFromRequest(request);
  if (!email) return NextResponse.json({ email: null });
  return NextResponse.json({ email });
}
