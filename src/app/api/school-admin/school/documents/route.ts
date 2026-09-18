import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const TARGET_FOLDER = "12bdc284-8351-4c3b-bf17-80cf37536ce3";
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_super_secret_key_for_development");

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

async function getUserIdFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return Number(payload.sub || payload.user_id || payload.id);
  } catch {
    return null;
  }
}

interface SchoolDoc {
  school_document_id?: number | string;
  school_id: number;
  document_type: string;
  document_name: string;
  directus_file_id: string;
  uploaded_by_user_id?: number | null;
  uploaded_at?: string;
}

interface DirectusFile {
  id: string;
  filesize?: number | string;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken();
    if (!userId && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!DIRECTUS_BASE) {
      return NextResponse.json({ error: "Directus base URL not configured." }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const schoolIdParam = searchParams.get("schoolId");

    let schoolId: number | null = schoolIdParam ? Number(schoolIdParam) : null;

    if (!schoolId && userId) {
      // Find school assigned to user
      const adminUrl = `${DIRECTUS_BASE}/items/vs_school_admin?filter[user_id][_eq]=${userId}&filter[is_active][_eq]=true`;
      const adminRes = await fetch(adminUrl, { headers: getHeaders(), cache: "no-store" });
      if (adminRes.ok) {
        const adminJson = await adminRes.json();
        schoolId = adminJson.data?.[0]?.school_id || null;
      }
    }

    if (!schoolId) {
      return NextResponse.json({ error: "Missing schoolId." }, { status: 400 });
    }

    const documentType = searchParams.get("documentType");

    let docsUrl = `${DIRECTUS_BASE}/items/vs_school_document?filter[school_id][_eq]=${schoolId}&fields=*`;
    if (documentType) {
      docsUrl += `&filter[document_type][_eq]=${encodeURIComponent(documentType)}`;
    }
    const docsRes = await fetch(docsUrl, {
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!docsRes.ok) {
      const errText = await docsRes.text();
      console.warn(`Directus vs_school_document query warning (${docsRes.status}):`, errText);
      return NextResponse.json([]);
    }

    const docsJson = await docsRes.json();
    const docs: SchoolDoc[] = docsJson.data || [];

    const fileIds = docs.map((d) => d.directus_file_id).filter(Boolean);
    const fileSizes: Record<string, number> = {};

    if (fileIds.length > 0) {
      try {
        const filesUrl = `${DIRECTUS_BASE}/files?filter[id][_in]=${fileIds.join(",")}&fields=id,filesize`;
        const filesRes = await fetch(filesUrl, {
          headers: getHeaders(),
          cache: "no-store",
        });
        if (filesRes.ok) {
          const filesJson = await filesRes.json();
          const filesData: DirectusFile[] = filesJson.data || [];
          filesData.forEach((f) => {
            fileSizes[f.id] = f.filesize ? Number(f.filesize) : 0;
          });
        }
      } catch (err) {
        console.error("Failed to fetch filesizes:", err);
      }
    }

    const result = docs.map((d) => ({
      id: d.directus_file_id,
      school_document_id: d.school_document_id,
      document_type: d.document_type,
      name: d.document_name,
      size: fileSizes[d.directus_file_id] || 0,
      uploaded_at: d.uploaded_at || null,
    }));

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET /api/school-admin/school/documents error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken();
    if (!userId && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!DIRECTUS_BASE) {
      return NextResponse.json({ error: "Directus base URL not configured." }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("document_type") as string) || "OTHER_DOCUMENT";
    const schoolIdStr = formData.get("school_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    let schoolId: number | null = schoolIdStr ? Number(schoolIdStr) : null;
    if (!schoolId && userId) {
      const adminUrl = `${DIRECTUS_BASE}/items/vs_school_admin?filter[user_id][_eq]=${userId}&filter[is_active][_eq]=true`;
      const adminRes = await fetch(adminUrl, { headers: getHeaders(), cache: "no-store" });
      if (adminRes.ok) {
        const adminJson = await adminRes.json();
        schoolId = adminJson.data?.[0]?.school_id || null;
      }
    }

    if (!schoolId) {
      return NextResponse.json({ error: "Missing school_id." }, { status: 400 });
    }

    // 1. Upload file to Directus storage
    const uploadUrl = `${DIRECTUS_BASE}/files`;
    const directusFormData = new FormData();
    directusFormData.append("file", file);
    directusFormData.append("folder", TARGET_FOLDER);

    const uploadHeaders: Record<string, string> = {};
    if (DIRECTUS_TOKEN) uploadHeaders["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: uploadHeaders,
      body: directusFormData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json(
        { error: `Failed to upload file to storage: ${errText}` },
        { status: uploadRes.status }
      );
    }

    const uploadData = await uploadRes.json();
    const fileId = uploadData.data?.id || uploadData.id;

    if (!fileId) {
      return NextResponse.json({ error: "File upload returned invalid response." }, { status: 500 });
    }

    // 2. If it is a singular document type, clean up any existing document record for this type
    if (documentType !== "OTHER_DOCUMENT") {
      try {
        const existingUrl = `${DIRECTUS_BASE}/items/vs_school_document?filter[school_id][_eq]=${schoolId}&filter[document_type][_eq]=${documentType}&fields=school_document_id,directus_file_id`;
        const existingRes = await fetch(existingUrl, { headers: getHeaders(), cache: "no-store" });
        if (existingRes.ok) {
          const existingJson = await existingRes.json();
          const existingDocs: SchoolDoc[] = existingJson.data || [];
          for (const oldDoc of existingDocs) {
            // Delete metadata row
            await fetch(`${DIRECTUS_BASE}/items/vs_school_document/${oldDoc.school_document_id}`, {
              method: "DELETE",
              headers: getHeaders(),
            });
            // Delete old file asset if different
            if (oldDoc.directus_file_id && oldDoc.directus_file_id !== fileId) {
              await fetch(`${DIRECTUS_BASE}/files/${oldDoc.directus_file_id}`, {
                method: "DELETE",
                headers: getHeaders(),
              });
            }
          }
        }
      } catch (cleanErr) {
        console.warn("Cleanup of prior school document had non-fatal error:", cleanErr);
      }
    }

    // 3. Insert record into vs_school_document
    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
    const docPayload = {
      school_id: schoolId,
      document_type: documentType,
      document_name: file.name,
      directus_file_id: fileId,
      uploaded_by_user_id: userId || null,
      uploaded_at: nowPH,
    };

    const insertUrl = `${DIRECTUS_BASE}/items/vs_school_document`;
    const insertRes = await fetch(insertUrl, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(docPayload),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      return NextResponse.json(
        { error: `Failed to create document record: ${errText}` },
        { status: insertRes.status }
      );
    }

    const insertedJson = await insertRes.json();
    return NextResponse.json({
      success: true,
      data: {
        id: fileId,
        school_document_id: insertedJson.data?.school_document_id,
        document_type: documentType,
        name: file.name,
        size: file.size,
        uploaded_at: nowPH,
      },
    });
  } catch (error: unknown) {
    console.error("POST /api/school-admin/school/documents error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken();
    if (!userId && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!DIRECTUS_BASE) {
      return NextResponse.json({ error: "Directus base URL not configured." }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json({ error: "Missing document file ID." }, { status: 400 });
    }

    // 1. Find the vs_school_document record matching directus_file_id
    const findUrl = `${DIRECTUS_BASE}/items/vs_school_document?filter[directus_file_id][_eq]=${fileId}&fields=school_document_id`;
    const findRes = await fetch(findUrl, {
      headers: getHeaders(),
      cache: "no-store",
    });

    if (findRes.ok) {
      const findJson = await findRes.json();
      const records: SchoolDoc[] = findJson.data || [];
      for (const record of records) {
        await fetch(`${DIRECTUS_BASE}/items/vs_school_document/${record.school_document_id}`, {
          method: "DELETE",
          headers: getHeaders(),
        });
      }
    }

    // 2. Delete asset in Directus storage
    const delFileUrl = `${DIRECTUS_BASE}/files/${fileId}`;
    const delFileRes = await fetch(delFileUrl, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!delFileRes.ok && delFileRes.status !== 404) {
      console.warn(`Failed to delete asset ${fileId} in Directus: ${delFileRes.status}`);
    }

    return NextResponse.json({ success: true, message: "School document deleted successfully." });
  } catch (error: unknown) {
    console.error("DELETE /api/school-admin/school/documents error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
