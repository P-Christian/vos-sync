import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticated-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  ""
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
]);

const FORBIDDEN_EXTENSIONS = /\.(svg|html?|xhtml|php\d*|phtml|exe|bat|cmd|sh|ps1|vbs|js|mjs|ts|jsx|tsx|jar|apk)$/i;

// ─── POST — Upload a file attachment via Directus Files ────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Directus base URL not configured." },
        { status: 500 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    // Validate MIME type and file extension
    const mimeType = (file.type || "").toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(mimeType) || FORBIDDEN_EXTENSIONS.test(file.name)) {
      return NextResponse.json(
        {
          error:
            "File type not supported. Allowed formats: images (JPEG, PNG, WebP, GIF), documents (PDF, Word, Excel, text), and ZIP archives.",
        },
        { status: 415 }
      );
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit." },
        { status: 413 }
      );
    }

    // Forward to Directus files endpoint
    const uploadForm = new FormData();
    uploadForm.append("file", file, file.name);

    const uploadHeaders: Record<string, string> = {};
    if (DIRECTUS_TOKEN) {
      uploadHeaders["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
    }

    const uploadRes = await fetch(`${DIRECTUS_BASE}/files`, {
      method: "POST",
      headers: uploadHeaders,
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error("Directus file upload error:", text);
      return NextResponse.json(
        { error: "Failed to upload file." },
        { status: uploadRes.status }
      );
    }

    const uploadJson = await uploadRes.json();
    const fileData = uploadJson.data;

    // Construct the public URL
    const fileUrl = `/api/assets/${fileData.id}`;

    return NextResponse.json({
      file_id: fileData.id,
      file_name: fileData.filename_download || file.name,
      file_path: fileUrl,
      file_size: file.size,
      mime_type: fileData.type || file.type,
    });
  } catch (err: unknown) {
    console.error("POST /api/client/messaging/upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
