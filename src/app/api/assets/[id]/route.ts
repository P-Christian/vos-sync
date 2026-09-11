import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/authenticated-session";
import { proxyDirectusAsset } from "@/lib/asset-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await authenticateRequest(req);
  return proxyDirectusAsset(req, id, session);
}
