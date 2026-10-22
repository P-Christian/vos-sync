// src/app/api/vos-admin/contact-messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAdministratorSession } from "@/lib/authenticated-session";
import {
  fetchContactMessagesRepo,
  type ContactMessageListParams,
  type ContactMessageStatus,
} from "@/modules/vos-admin/contact-messages";

const VALID_STATUSES = new Set<ContactMessageStatus>(["new", "read", "resolved", "archived"]);

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdministratorSession(session)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const rawStatus = searchParams.get("status") ?? "all";
    const q = searchParams.get("q") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));

    const params: ContactMessageListParams = {
      status:
        rawStatus === "all"
          ? "all"
          : VALID_STATUSES.has(rawStatus as ContactMessageStatus)
          ? (rawStatus as ContactMessageStatus)
          : "all",
      q,
      from,
      to,
      page,
      pageSize,
    };

    const result = await fetchContactMessagesRepo(params);
    return NextResponse.json({ items: result.items, total: result.total });
  } catch (error: unknown) {
    console.error("[GET /api/vos-admin/contact-messages]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
