import { NextResponse } from "next/server";
import {
  getRegistrationMetadata,
  handleRegistrationRouteError,
} from "@/modules/auth/registration";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET() {
  try {
    const metadata = await getRegistrationMetadata();
    return NextResponse.json(
      { ok: true, ...metadata },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    return handleRegistrationRouteError(error);
  }
}
