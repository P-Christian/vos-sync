"use server";

interface MasterSkillRow {
  id: number;
  skill_name: string;
}

interface MasterSkillsResponse {
  data?: MasterSkillRow[];
}

export async function searchMasterSkillsAction(
  query: string,
): Promise<{ id: number; skill_name: string }[]> {
  if (query.trim().length < 2) return [];

  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = process.env.DIRECTUS_STATIC_TOKEN;

  if (!base || !token) {
    throw new Error("Directus API URL or Static Token is not configured.");
  }

  try {
    const url =
      `${base}/items/vs_master_skills` +
      `?filter[skill_name][_icontains]=${encodeURIComponent(query)}` +
      `&fields=id,skill_name&limit=20`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to search master skills", await res.text());
      return [];
    }

    const json = (await res.json()) as MasterSkillsResponse;
    return json.data ?? [];
  } catch (err: unknown) {
    console.error(
      "searchMasterSkillsAction Error:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}
