// src/app/api/client/jobs/refine-text/route.ts
import { NextRequest, NextResponse } from "next/server";
import { callGeminiMonitored } from "@/lib/gemini/geminiMonitoring";
import { authenticateRequest, isClientSession } from "@/lib/authenticated-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session && !isClientSession(session) && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Forbidden: employer access required." }, { status: 403 });
    }

    const userId = session?.userId ? Number(session.userId) : 1;

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
