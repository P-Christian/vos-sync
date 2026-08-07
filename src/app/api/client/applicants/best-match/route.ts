// src/app/api/client/applicants/best-match/route.ts

import { NextResponse } from "next/server";
import { callGeminiSafe } from "@/lib/gemini/geminiClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Prompt is required." },
        { status: 400 }
      );
    }

    const rawGemini = await callGeminiSafe(prompt);

    if (!rawGemini) {
      return NextResponse.json({
        success: false,
        result: null,
        message: "Gemini AI unavailable or API key not configured.",
      });
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
