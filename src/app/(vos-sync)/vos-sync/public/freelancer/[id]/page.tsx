import { notFound } from "next/navigation";
import { getPublicFreelancerProfile } from "@/modules/public/public-profile/services/public-profile.service";
import { PublicProfileRender } from "@/modules/public/public-profile/components/PublicProfileRender";
import { PortalPageHeader } from "@/components/shared/layout/PortalPageHeader";
import { cookies } from "next/headers";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    const id = payload?.user_id ?? payload?.sub ?? payload?.id ?? null;
    return id != null ? Number(id) : null;
  } catch {
    return null;
  }
}

export default async function PublicFreelancerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = parseInt(id, 10);

  if (isNaN(userId)) {
    notFound();
  }

  // Determine caller role
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value;
  let callerUser = { name: "Guest", email: "guest@example.com", avatar: "" };
  let callerRole = 0;
  
  if (token) {
    const callerId = getUserIdFromToken(token);
    if (callerId) {
      const callerRes = await fetch(`${DIRECTUS_BASE}/items/vs_user/${callerId}?fields=role_id,user_fname,user_lname,user_email`, {
        headers: { "Authorization": `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}` }
      });
      if (callerRes.ok) {
        const callerJson = await callerRes.json();
        callerRole = callerJson.data?.role_id || 0;
        callerUser = {
          name: `${callerJson.data?.user_fname || ""} ${callerJson.data?.user_lname || ""}`.trim() || "Guest",
          email: callerJson.data?.user_email || "guest@example.com",
          avatar: "",
        };
      }
    }
  }

  const profile = await getPublicFreelancerProfile(userId, callerRole);

  if (!profile) {
    notFound();
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <PortalPageHeader user={callerUser} />

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8">
        <PublicProfileRender profile={profile} />
      </main>
    </div>
  );
}
