// src/app/api/vos-admin/career-articles/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticated-session";
import { CareerArticleService } from "@/modules/vos-admin/career-advice-management/services/article.service";
import { UpdateCareerArticleSchema } from "@/modules/vos-admin/career-advice-management/types/article.schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const articleId = Number(id);
    if (isNaN(articleId)) {
      return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
    }

    const article = await CareerArticleService.getArticleById(articleId);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({ data: article });
  } catch (err: any) {
    console.error("[api/career-articles/[id] GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch article" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const articleId = Number(id);
    if (isNaN(articleId)) {
      return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = UpdateCareerArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 422 });
    }

    const updated = await CareerArticleService.updateArticle(articleId, parsed.data);
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    console.error("[api/career-articles/[id] PATCH] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update article" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const articleId = Number(id);
    if (isNaN(articleId)) {
      return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
    }

    await CareerArticleService.deleteArticle(articleId);
    return NextResponse.json({ success: true, message: "Article deleted successfully" });
  } catch (err: any) {
    console.error("[api/career-articles/[id] DELETE] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete article" }, { status: 500 });
  }
}
