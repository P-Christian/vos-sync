// src/app/api/client/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const SPRING_API_BASE = process.env.SPRING_API_BASE_URL;

    // Standard Mock Data for UI-only and fallback development
    const mockDashboardData = {
      company: {
        id: 101,
        company_name: "Vertex Technologies Corporation",
        company_email: "hr@vertex.com.ph",
        company_contact: "+63 (2) 8123-4567",
        industry: "Information Technology",
        business_type: "Corporation",
        company_size: "51-200 employees",
        company_website: "https://vertex.com.ph",
        company_province: "Metro Manila",
        company_city: "Makati City",
        verification_status: "PENDING", // PENDING, VERIFIED, REJECTED, SUSPENDED
        profile_completion_percent: 75,
      },
      stats: {
        totalJobs: 12,
        activeJobs: 4,
        totalApplicants: 48,
        pendingInterviews: 8,
        hiredCount: 14,
      },
      recentJobs: [
        {
          id: 1,
          title: "Senior Full Stack Engineer (Next.js & Java)",
          department: "Engineering",
          location: "Makati (Hybrid)",
          applicantsCount: 18,
          status: "ACTIVE",
          postedAt: "2026-07-01T10:00:00Z",
        },
        {
          id: 2,
          title: "Technical Support Specialist",
          department: "Customer Success",
          location: "Manila (On-site)",
          applicantsCount: 12,
          status: "ACTIVE",
          postedAt: "2026-07-03T14:30:00Z",
        },
        {
          id: 3,
          title: "UI/UX Product Designer",
          department: "Product Design",
          location: "Remote",
          applicantsCount: 9,
          status: "ACTIVE",
          postedAt: "2026-07-05T09:15:00Z",
        },
        {
          id: 4,
          title: "DevOps Engineer (AWS/Kubernetes)",
          department: "Infrastructure",
          location: "Makati (Hybrid)",
          applicantsCount: 9,
          status: "DRAFT",
          postedAt: "2026-07-08T16:00:00Z",
        },
      ],
      recentApplicants: [
        {
          id: 501,
          name: "John Michael Santos",
          jobTitle: "Senior Full Stack Engineer (Next.js & Java)",
          email: "jm.santos@gmail.com",
          experience: "5 years",
          status: "SHORTLISTED",
          appliedDate: "2026-07-06T11:20:00Z",
        },
        {
          id: 502,
          name: "Patricia Anne Reyes",
          jobTitle: "UI/UX Product Designer",
          email: "patricia.reyes@gmail.com",
          experience: "3 years",
          status: "APPLIED",
          appliedDate: "2026-07-07T08:45:00Z",
        },
        {
          id: 503,
          name: "Alexander David Cruz",
          jobTitle: "Senior Full Stack Engineer (Next.js & Java)",
          email: "alex.cruz@outlook.com",
          experience: "7 years",
          status: "INTERVIEW_SCHEDULED",
          appliedDate: "2026-07-05T15:10:00Z",
        },
        {
          id: 504,
          name: "Maria Sophia Bautista",
          jobTitle: "Technical Support Specialist",
          email: "sophia.b@yahoo.com",
          experience: "2 years",
          status: "APPLIED",
          appliedDate: "2026-07-08T13:00:00Z",
        },
        {
          id: 505,
          name: "Joseph Kyle Salazar",
          jobTitle: "Technical Support Specialist",
          email: "kyle.salazar@gmail.com",
          experience: "4 years",
          status: "REJECTED",
          appliedDate: "2026-07-04T10:15:00Z",
        },
      ],
    };

    if (!SPRING_API_BASE) {
      return NextResponse.json(mockDashboardData);
    }

    const url = new URL(`${SPRING_API_BASE.replace(/\/$/, "")}/api/client/dashboard`);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          // Send JWT token from cookie if available
          Authorization: `Bearer ${req.cookies.get("vos_access_token")?.value || ""}`,
        },
        cache: "no-store",
      });

      const text = await response.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!response.ok) {
        // Fall back to mock if backend is not yet fully implemented (e.g. returns 404 or 503)
        return NextResponse.json(mockDashboardData);
      }

      return NextResponse.json(data || mockDashboardData);
    } catch (fetchError) {
      console.warn("Failed to connect to Spring Boot backend for Dashboard. Returning mocks:", fetchError);
      return NextResponse.json(mockDashboardData);
    }
  } catch (error: unknown) {
    console.error("API Route Dashboard Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

