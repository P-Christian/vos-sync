import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";
const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

async function verifyAdmin(req: Request): Promise<number | null> {
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") return 1;
    const cookieStore = await cookies();
    const token = req.headers.get("authorization")?.replace("Bearer ", "") || cookieStore.get("vos_access_token")?.value;
    if (!token) return null;
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);
        return Number(payload.sub || payload.user_id || payload.id);
    } catch {
        return null;
    }
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    };
}

export async function GET(req: Request) {
    try {
        const adminId = await verifyAdmin(req);
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Fetch unverified schools
        const url = `${DIRECTUS_BASE}/items/vs_employee_education?filter[education_status][_eq]=Pending&filter[school_id][_null]=true&fields=employee_education_id,id,school_name_raw,course_name_raw,user_id.*,date_created`;
        const res = await fetch(url, { headers: getHeaders(), cache: 'no-store' });
        const json = await res.json();
        
        const rawRequests = json.data || [];
        
        // Group by case-insensitive school_name_raw
        const groupedMap = new Map<string, any>();
        
        for (const req of rawRequests) {
            const rawName = req.school_name_raw || "Unknown";
            const normalizedName = rawName.trim().toLowerCase();
            
            if (!groupedMap.has(normalizedName)) {
                groupedMap.set(normalizedName, {
                    normalized_name: normalizedName,
                    display_name: rawName,
                    count: 0,
                    requests: []
                });
            }
            
            const group = groupedMap.get(normalizedName);
            group.count++;
            group.requests.push(req);
        }

        return NextResponse.json({ requests: Array.from(groupedMap.values()) });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const adminId = await verifyAdmin(req);
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { employee_education_id, ...schoolData } = body;

        // Create the school
        const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_school`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(schoolData)
        });
        const createJson = await createRes.json();
        if (!createRes.ok) return NextResponse.json({ error: "Failed to create school" }, { status: 400 });

        const newSchoolId = createJson.data.school_id || createJson.data.id;

        // Update the employee education record
        const patchRes = await fetch(`${DIRECTUS_BASE}/items/vs_employee_education/${employee_education_id}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
                school_id: newSchoolId,
                education_status: 'Verified'
            })
        });
        
        if (!patchRes.ok) {
            const errText = await patchRes.text();
            console.error("PATCH education failed:", errText);
            return NextResponse.json({ error: "Failed to update education record" }, { status: 400 });
        }

        return NextResponse.json({ success: true, school: createJson.data });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const adminId = await verifyAdmin(req);
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { id, action } = body;

        if (action === 'reject') {
            await fetch(`${DIRECTUS_BASE}/items/vs_employee_education/${id}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({
                    education_status: 'Unverified'
                })
            });
        }
        
        if (action === 'bulk-map') {
            const { education_ids, official_school_id } = body;
            
            if (!education_ids || !Array.isArray(education_ids) || !official_school_id) {
                return NextResponse.json({ error: "Invalid data for bulk mapping" }, { status: 400 });
            }
            
            // Step 1: Fetch education records to get user_id and course_name_raw
            const idsQuery = education_ids.join(',');
            const url = `${DIRECTUS_BASE}/items/vs_employee_education?filter[employee_education_id][_in]=${idsQuery}&fields=employee_education_id,user_id,course_name_raw`;
            const fetchRes = await fetch(url, { headers: getHeaders(), cache: 'no-store' });
            const fetchJson = await fetchRes.json();
            const eduRecords = fetchJson.data || [];

            // Step 2: Auto-create Course Requests
            for (const record of eduRecords) {
                if (record.course_name_raw && record.course_name_raw.trim() !== '') {
                    const courseRequestPayload = {
                        school_id: official_school_id,
                        requested_by: record.user_id,
                        requested_course_name: record.course_name_raw.trim(),
                        request_status: 'Pending'
                    };
                    
                    await fetch(`${DIRECTUS_BASE}/items/vs_course_request`, {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify(courseRequestPayload)
                    });
                }
            }
            
            // Step 3: Bulk PATCH education records
            const payload = education_ids.map(edu_id => ({
                employee_education_id: edu_id,
                school_id: official_school_id,
                education_status: 'Verified'
            }));
            
            const bulkRes = await fetch(`${DIRECTUS_BASE}/items/vs_employee_education`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            
            if (!bulkRes.ok) {
                const errText = await bulkRes.text();
                console.error("Bulk PATCH education failed:", errText);
                return NextResponse.json({ error: "Failed to bulk update education records" }, { status: 400 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
