import { cookies } from "next/headers";

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export async function getHeaderUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value ?? null;
  const p = token ? decodeJwtPayload(token) : null;
  
  const pickString = (obj: Record<string, unknown> | null, keys: string[]) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  const first = pickString(p, ["Firstname", "FirstName", "firstName", "first_name", "user_fname"]);
  const last = pickString(p, ["LastName", "Lastname", "lastName", "last_name", "user_lname"]);
  const email = pickString(p, ["email", "Email", "user_email"]);
  
  return {
    name: [first, last].filter(Boolean).join(" ") || email || "School Admin",
    email: email || "admin@school.com",
    avatar: p?.user_image ? `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/assets/${p.user_image}` : "",
  };
}
