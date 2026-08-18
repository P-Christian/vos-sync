// src/app/api/client/jobs/refine-text/route.ts
import { NextRequest, NextResponse } from "next/server";
import { callGeminiMonitored } from "@/lib/gemini/geminiMonitoring";

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
    return id != null ? Number(id) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const userId = getUserIdFromToken(token);

    const body = await req.json().catch(() => ({}));
    const text = (body.text || "").trim();
    const action = body.action || "improve"; // "improve" | "concise" | "technical" | "regenerate" | "custom"
    const customPrompt = (body.custom_prompt || "").trim();
    const fieldType = body.field_type || "job_description"; // "job_description" | "job_responsibilities" | "job_qualifications"
    const jobTitle = body.job_title || "Job Posting";

    if (!text && action !== "regenerate") {
      return NextResponse.json({ error: "Content is required to refine." }, { status: 400 });
    }

    let instructionDetails = "";
    switch (action) {
      case "concise":
        instructionDetails = "Make this text clear, concise, and punchy while preserving key technical terms and responsibilities.";
        break;
      case "technical":
        instructionDetails = "Enhance the technical depth and professional precision of the terminology suitable for modern software engineering hiring standards.";
        break;
      case "regenerate":
        instructionDetails = `Generate a fresh, compelling, and high-standard ${fieldType.replace("job_", "")} for the position "${jobTitle}".`;
        break;
      case "custom":
        instructionDetails = `Apply this custom user instruction: "${customPrompt}"`;
        break;
      case "improve":
      default:
        instructionDetails = "Elevate the clarity, tone, and professional appeal for top-tier candidates.";
        break;
    }

    const isListField = fieldType === "job_responsibilities" || fieldType === "job_qualifications";

    const prompt = `You are an expert technical recruiter editing job postings.
Refine the following ${fieldType} for the role "${jobTitle}".

INSTRUCTION: ${instructionDetails}

ORIGINAL CONTENT:
${text || "(Empty - please generate standard professional content)"}

CRITICAL RULES:
1. Format output in valid, clean HTML only.
${isListField ? "2. For lists, output ONLY a <ul><li>...</li></ul> list with 4 to 8 clear bullet items." : "2. For descriptions, output structured HTML (<p>...</p>, <b>...</b>)."}
3. DO NOT wrap with markdown backticks or \`\`\`html tags. Return raw HTML only.`;

    const refinedHtml = await callGeminiMonitored({
      prompt,
      feature: "REFINE_JOB_TEXT",
      endpoint: "/api/client/jobs/refine-text",
      requestType: "TEXT",
      provider: "GEMINI",
      userId: userId ?? undefined,
      timeoutMs: 20000,
    });

    if (!refinedHtml) {
      return NextResponse.json(
        { error: "AI service failed to refine text. Please try again." },
        { status: 502 }
      );
    }

    let cleaned = refinedHtml.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:html)?\n?/, "").replace(/\n?```$/, "");
    }

    return NextResponse.json({
      success: true,
      refined_html: cleaned,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
