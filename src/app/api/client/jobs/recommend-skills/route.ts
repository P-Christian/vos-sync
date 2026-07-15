// src/app/api/client/jobs/recommend-skills/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as jobService from "../service.directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "";
    const description = searchParams.get("description") || "";

    if (!title.trim() && !description.trim()) {
      return NextResponse.json({ skills: [] });
    }

    const skills = await jobService.recommendSkills(title, description);
    return NextResponse.json({ skills });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
