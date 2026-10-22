// src/app/api/vos-admin/contact-messages/unread-count/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAdministratorSession } from "@/lib/authenticated-session";
import { countNewContactMessagesRepo } from "@/modules/vos-admin/contact-messages";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdministratorSession(session)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const count = await countNewContactMessagesRepo();
    return NextResponse.json({ unreadCount: count });
  } catch (error: unknown) {
    console.error("[GET /api/vos-admin/contact-messages/unread-count]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
