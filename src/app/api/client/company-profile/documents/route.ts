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

interface CompanyDoc {
  company_document_id?: number | string;
  company_id: number;
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
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!DIRECTUS_BASE) {
      return NextResponse.json({ error: "Directus base URL not configured." }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ error: "Missing companyId parameter." }, { status: 400 });
    }

    // 1. Fetch records from vs_company_document
    const docsUrl = `${DIRECTUS_BASE}/items/vs_company_document?filter[company_id][_eq]=${companyId}&filter[document_type][_eq]=VERIFICATION DOCUMENTS&fields=*`;
    const docsRes = await fetch(docsUrl, {
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!docsRes.ok) {
      const errText = await docsRes.text();
      return NextResponse.json(
        { error: `Failed to fetch documents: ${errText}` },
        { status: docsRes.status }
      );
    }

    const docsJson = await docsRes.json();
    const docs: CompanyDoc[] = docsJson.data || [];

    // 2. Fetch filesizes from directus_files
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

    // 3. Format response
    const result = docs.map((d) => ({
      id: d.directus_file_id,
      name: d.document_name,
      size: fileSizes[d.directus_file_id] || 0,
    }));

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET /api/client/company-profile/documents error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json({ error: "Missing document/file ID." }, { status: 400 });
    }

    // 1. Find the vs_company_document record matching directus_file_id
    const findUrl = `${DIRECTUS_BASE}/items/vs_company_document?filter[directus_file_id][_eq]=${fileId}&fields=company_document_id`;
    const findRes = await fetch(findUrl, {
      headers: getHeaders(),
      cache: "no-store",
    });

    if (findRes.ok) {
      const findJson = await findRes.json();
      const records: CompanyDoc[] = findJson.data || [];
      
      // Delete metadata records
      for (const record of records) {
        const delRecordUrl = `${DIRECTUS_BASE}/items/vs_company_document/${record.company_document_id}`;
        await fetch(delRecordUrl, {
          method: "DELETE",
          headers: getHeaders(),
        });
      }
    }

    // 2. Delete the actual file asset in Directus files
    const delFileUrl = `${DIRECTUS_BASE}/files/${fileId}`;
    const delFileRes = await fetch(delFileUrl, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!delFileRes.ok && delFileRes.status !== 404) {
      console.warn(`Failed to delete asset file ${fileId} in Directus: ${delFileRes.status}`);
    }

    return NextResponse.json({ success: true, message: "Document deleted successfully." });
  } catch (error: unknown) {
    console.error("DELETE /api/client/company-profile/documents error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
