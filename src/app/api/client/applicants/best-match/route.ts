// src/app/api/client/applicants/best-match/route.ts

import { NextRequest, NextResponse } from "next/server";
import { callGeminiMonitored } from "@/lib/gemini/geminiMonitoring";
import { evaluateTaxonomyProposal } from "@/modules/vos-admin/role-matching/services/taxonomy/taxonomyGovernanceService";

export async function POST(req: NextRequest) {
  try {
    // Extract user attribution from JWT
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;
    let userId: number | undefined;
    let companyId: number | undefined;
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length >= 2) {
          const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
          const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
          const uid = payload?.user_id ?? payload?.sub ?? payload?.id ?? null;
          if (uid !== null) userId = Number(uid);
          const cid = payload?.company_id ?? null;
          if (cid !== null) companyId = Number(cid);
        }
      } catch { /* ignore token parse errors */ }
    }

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
