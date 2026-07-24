// src/app/api/vos-admin/audit-trail/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { fetchAuditLogsRepo, fetchAuditKPIsRepo, AuditFilters } from "@/modules/vos-admin/audit-trail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secret_key_for_development"
);

async function verifyAdminRole(req: NextRequest): Promise<{ adminId: number; roleId: number } | null> {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
    return { adminId: 1, roleId: 3 };
  }
  const cookieStore = await cookies();
  const token = req.headers.get("authorization")?.replace("Bearer ", "") || cookieStore.get("vos_access_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const adminId = Number(payload.sub || payload.user_id || payload.id);
    const roleId = Number(payload.role_id ?? payload.role ?? 0);
    return { adminId, roleId };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized: Invalid or missing token" }, { status: 401 });
    }

    // Role restriction: Admin only
    if (auth.roleId !== 3 && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Forbidden: Access restricted to administrators" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const isExport = searchParams.get("export") === "csv";

    const filters: AuditFilters = {
      page: Number(searchParams.get("page") || 1),
      limit: isExport ? -1 : Number(searchParams.get("limit") || 25),
      search: searchParams.get("search") || undefined,
      event_category: searchParams.get("event_category") || undefined,
      action: searchParams.get("action") || undefined,
      status: searchParams.get("status") || undefined,
      actor_type: searchParams.get("actor_type") || undefined,
      organization_type: searchParams.get("organization_type") || undefined,
      resource_type: searchParams.get("resource_type") || undefined,
      actor_user_id: searchParams.get("actor_user_id") ? Number(searchParams.get("actor_user_id")) : undefined,
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
    };

    const { records, total } = await fetchAuditLogsRepo(filters);

    // CSV export mode
    if (isExport) {
      const headers = [
        "Audit ID",
        "Timestamp",
        "Category",
        "Event Type",
        "Action",
        "Status",
        "Actor Type",
        "Actor User ID",
        "Actor Name",
        "Resource Type",
        "Resource ID",
        "Organization Type",
        "Reason",
        "IP Address",
        "Correlation ID",
      ];

      const csvRows = [headers.join(",")];

      records.forEach((r) => {
        const row = [
          r.audit_id,
          `"${r.created_at || ''}"`,
          `"${r.event_category || ''}"`,
          `"${r.event_type || ''}"`,
          `"${r.action || ''}"`,
          `"${r.status || ''}"`,
          `"${r.actor_type || ''}"`,
          r.actor_user_id ?? "",
          `"${(r.actor_name || '').replace(/"/g, '""')}"`,
          `"${r.resource_type || ''}"`,
          `"${r.resource_id || ''}"`,
          `"${r.organization_type || ''}"`,
          `"${(r.reason || '').replace(/"/g, '""')}"`,
          `"${r.ip_address || ''}"`,
          `"${r.correlation_id || ''}"`,
        ];
        csvRows.push(row.join(","));
      });

      const csvString = csvRows.join("\n");
      const fileName = `audit_trail_${new Date().toISOString().split("T")[0]}.csv`;

      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    // Normal JSON response with KPIs
    const kpis = await fetchAuditKPIsRepo();

    return NextResponse.json({
      records,
      total,
      kpis,
    });
  } catch (error: unknown) {
    console.error("API Route Error (audit-trail):", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
