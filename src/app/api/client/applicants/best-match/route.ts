// src/app/api/client/applicants/best-match/route.ts

import { NextRequest, NextResponse } from "next/server";
import { callGeminiMonitored } from "@/lib/gemini/geminiMonitoring";
import { evaluateTaxonomyProposal } from "@/modules/vos-admin/role-matching/services/taxonomy/taxonomyGovernanceService";
import { authenticateRequest } from "@/lib/authenticated-session";

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    const userId = session ? Number(session.userId) : undefined;
    const companyId = session?.payload?.company_id ? Number(session.payload.company_id) : undefined;

    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Prompt is required." },
        { status: 400 }
      );
    }

    const rawGemini = await callGeminiMonitored({
      prompt,
      feature: "BEST_MATCH",
      endpoint: "/api/client/applicants/best-match",
      userId,
      companyId,
    });

    if (!rawGemini) {
      return NextResponse.json({
        success: false,
        result: null,
        message: "Gemini AI unavailable or API key not configured.",
      });
    }

    // Non-blocking asynchronous taxonomy governance enrichment on the server
    try {
      const cleaned = rawGemini
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (parsed?.taxonomyProposal && typeof parsed.taxonomyProposal === "object") {
        void evaluateTaxonomyProposal({
          roleName: parsed.taxonomyProposal.roleName || "",
          keywords: Array.isArray(parsed.taxonomyProposal.keywords) ? parsed.taxonomyProposal.keywords : [],
          skills: Array.isArray(parsed.taxonomyProposal.skills) ? parsed.taxonomyProposal.skills : [],
        })
          .then((res) => console.info("[BEST_MATCH API] ✅ Server-side Taxonomy Governance completed:", res))
          .catch((err) => console.error("[BEST_MATCH API] ⚠️ Server-side Taxonomy Governance failed:", err?.message ?? err));
      }
    } catch {
      // Non-blocking if JSON parsing fails
    }

    return NextResponse.json({
      success: true,
      result: rawGemini,
    });
  } catch (error) {
    console.error("[BestMatchAI API] Error generating AI match explanations:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
