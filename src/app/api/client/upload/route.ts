import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

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
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!DIRECTUS_BASE) {
      return NextResponse.json({ error: "Directus base URL not configured." }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const companyId = formData.get("companyId");
    const documentType = formData.get("documentType") || "VERIFICATION DOCUMENTS";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const url = `${DIRECTUS_BASE}/files`;
    const directusFormData = new FormData();
    directusFormData.append("file", file);

    // Resolve or create folder
    let folder = formData.get("folder") as string | null;
    if (companyId) {
      try {
        const folderRes = await fetch(`${DIRECTUS_BASE}/folders?filter[name][_eq]=client_documents`, {
          headers: getHeaders(),
          cache: "no-store",
        });
        if (folderRes.ok) {
          const folderJson = await folderRes.json();
          if (folderJson.data && folderJson.data.length > 0) {
            folder = folderJson.data[0].id;
          } else {
            // Create client_documents folder under vos-sync if it exists
            const createRes = await fetch(`${DIRECTUS_BASE}/folders`, {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({
                name: "client_documents",
                parent: "f4d4f759-7821-4380-aecb-5100ea7095ab" // Under vos-sync parent folder
              }),
            });
            if (createRes.ok) {
              const createJson = await createRes.json();
              folder = createJson.data?.id || null;
            }
          }
        }
      } catch (err) {
        console.error("Error ensuring client_documents folder:", err);
      }
    }

    if (folder) {
      directusFormData.append("folder", folder);
    }

    const headers: Record<string, string> = {};
    if (DIRECTUS_TOKEN) {
      headers["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: directusFormData,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Failed to upload file to storage: ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const uploadedFile = data.data;

    // Create entry in vs_company_document if companyId is provided
    if (companyId && uploadedFile) {
      const userId = getUserIdFromToken(token);
      let documentName = "document";
      if (file && typeof file === "object" && file instanceof File) {
        documentName = file.name;
      }
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");

      const docPayload = {
        company_id: Number(companyId),
        document_type: documentType,
        document_name: documentName,
        directus_file_id: uploadedFile.id,
        uploaded_by_user_id: userId,
        uploaded_at: now
      };

      const docRes = await fetch(`${DIRECTUS_BASE}/items/vs_company_document`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(docPayload),
      });

      if (!docRes.ok) {
        const docErrText = await docRes.text();
        console.error("Failed to save vs_company_document metadata:", docErrText);
      }
    }

    return NextResponse.json(uploadedFile);
  } catch (error: unknown) {
    console.error("Upload API route error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

