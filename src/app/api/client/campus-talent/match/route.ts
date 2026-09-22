// src/app/api/client/campus-talent/match/route.ts
// POST: Runs the full campus matching pipeline for students against a selected job.
// Architecture: Eligibility → Deterministic Score → Evidence → Gemini Explanation
// Gemini does NOT modify scores. It explains deterministic evidence and gaps only.

import { NextRequest, NextResponse } from "next/server";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";
import {
  CampusCandidate,
  NormalizedJobRequirements,
  CampusMatchResult,
} from "@/modules/matching-engine/campus/types";
import { normalizeJobRequirements, RawJobPosting } from "@/modules/matching-engine/campus/requirementNormalizer";
import { runCampusMatch } from "@/modules/matching-engine/campus/runCampusMatch";
import { generateCampusMatchExplanation } from "@/lib/gemini/campusMatchExplainer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    const id = payload?.user_id ?? payload?.sub ?? payload?.id ?? null;
    return id !== null ? Number(id) : null;
  } catch {
    return null;
  }
}

interface MatchRequestBody {
  job: RawJobPosting;
  candidates: CampusCandidate[];
  withExplanation?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const { isVerified, verification_status, companyId } = await checkCompanyVerificationStatus(userId);
    if (!isVerified || !companyId) {
      return NextResponse.json(
        { error: `Restricted: Company status is ${verification_status}.` },
        { status: 403 }
      );
    }

    const body = (await req.json()) as MatchRequestBody;
    const { job, candidates, withExplanation = true } = body;

    if (!job || !Array.isArray(candidates)) {
      return NextResponse.json({ error: "Missing job or candidates." }, { status: 400 });
    }

    if (candidates.length > 200) {
      return NextResponse.json({ error: "Maximum 200 candidates per batch." }, { status: 400 });
    }

    // Step 1: Normalize the job requirements (REQUIRED vs PREFERRED)
    const normalizedJob: NormalizedJobRequirements = normalizeJobRequirements(job);

    // Step 2: Run deterministic matching for each candidate
    const deterministicResults: CampusMatchResult[] = candidates.map((candidate) =>
      runCampusMatch(candidate, normalizedJob)
    );

    // Step 3: Sort by score descending (eligible first)
    deterministicResults.sort((a, b) => {
      if (a.eligibility.eligible && !b.eligibility.eligible) return -1;
      if (!a.eligibility.eligible && b.eligibility.eligible) return 1;
      return b.score - a.score;
    });

    // Step 4: Optionally enrich top eligible candidates with Gemini explanations
    // Only explain top 10 eligible candidates to stay within token budget
    if (withExplanation) {
      const eligible = deterministicResults.filter((r) => r.eligibility.eligible);
      const topCandidates = eligible.slice(0, 10);

      await Promise.allSettled(
        topCandidates.map(async (result) => {
          const explanation = await generateCampusMatchExplanation(result, job.job_title, {
            userId,
            companyId,
          });
          result.explanation = explanation;
        })
      );
    }

    return NextResponse.json({
      jobId: job.job_id,
      jobTitle: job.job_title,
      total: deterministicResults.length,
      eligibleCount: deterministicResults.filter((r) => r.eligibility.eligible).length,
      results: deterministicResults,
    });
  } catch (err: unknown) {
    console.error("[campus-talent/match POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
