import { NextRequest, NextResponse } from "next/server";
import { AuthenticatedSession } from "@/lib/authenticated-session";
import { authorizeAssetAccess } from "@/lib/protected-assets";

function getDirectusConfig(): { baseUrl: string; token: string } | null {
  const baseUrl = (
    process.env.DIRECTUS_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || ""
  ).replace(/\/$/u, "");
  const token = process.env.DIRECTUS_STATIC_TOKEN?.trim() || "";
  return baseUrl && token ? { baseUrl, token } : null;
}

/** Shared protected/public asset proxy used by the legacy URL aliases. */
export async function proxyDirectusAsset(
  req: NextRequest,
  id: string,
  session: AuthenticatedSession | null,
): Promise<NextResponse> {
  if (!id || id === "undefined" || id === "null" || id.includes("/")) {
    return NextResponse.json({ error: "Missing asset ID" }, { status: 400 });
  }

  const config = getDirectusConfig();
  if (!config) return NextResponse.json({ error: "Directus base URL not configured." }, { status: 500 });

  const access = await authorizeAssetAccess(id, session);
  if (!access.allowed) {
    if (access.notFound) return new NextResponse(null, { status: 404 });
    return NextResponse.json(
      { error: session ? "You are not authorized to access this asset." : "Unauthorized." },
      { status: session ? 403 : 401 },
    );
  }

  try {
    const query = new URL(req.url).searchParams.toString();
    const url = `${config.baseUrl}/assets/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    if (!response.ok) return new NextResponse(null, { status: response.status });

    const responseHeaders: Record<string, string> = {
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": access.protected
        ? "private, no-store"
        : response.headers.get("cache-control") || "public, max-age=31536000",
    };
    const contentLength = response.headers.get("content-length");
    if (contentLength) responseHeaders["Content-Length"] = contentLength;

    return new NextResponse(Buffer.from(await response.arrayBuffer()), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Assets proxy route error:", error);
    return NextResponse.json({ error: "Asset retrieval failed." }, { status: 502 });
  }
}

