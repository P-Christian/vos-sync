"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createVerificationSubmission, approveMobileVerification, deleteExistingVerification, IdentityVerification } from "./identity-verification.repo";
import { getFreelancerProfile } from "./freelancer-profile.service";

export async function uploadVerificationDocumentAction(userId: number, formData: FormData) {
    const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
    // We can use the same folder id or just default
    const FOLDER_ID = 'e81cc874-8036-4655-8bbb-1524a194866b';

    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }

    try {
        const uploadUrl = `${NEXT_PUBLIC_API_BASE_URL}/files`;
        const uploadRes = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}` },
            body: formData,
        });

        if (!uploadRes.ok) throw new Error(`Failed to upload media: HTTP ${uploadRes.status}`);
        const json = await uploadRes.json();
        const fileId = json.data.id;

        // Move the file into the specific folder
        const patchRes = await fetch(`${uploadUrl}/${fileId}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ folder: FOLDER_ID })
        });
        
        if (!patchRes.ok) {
            console.error(`Failed to assign folder to file ${fileId}`);
        }

        return { success: true, fileId };
    } catch (err: unknown) {
        console.error("uploadVerificationDocumentAction Error:", err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

export async function submitIdentityVerificationAction(payload: Partial<IdentityVerification>) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("vos_access_token")?.value;
        if (!token) throw new Error("Unauthorized");
        const profile = await getFreelancerProfile(token);
        if (!profile) throw new Error("Unauthorized");
        if (!payload.type) throw new Error("Verification type is required");

        // Delete any existing verification record and associated files for this type
        await deleteExistingVerification(profile.user_id, payload.type);

        await createVerificationSubmission({
            ...payload,
            user_id: profile.user_id,
            status: "pending"
        });

        revalidatePath("/(vos-sync)/vos-sync/freelancer/verify-identity");
        return { success: true };
    } catch (error: any) {
        console.error("submitIdentityVerificationAction Error:", error);
        return { success: false, error: error.message || "Failed to submit verification" };
    }
}

export async function sendMobileOtpAction(mobileNumber: string) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("vos_access_token")?.value;
        if (!token) throw new Error("Unauthorized");
        const profile = await getFreelancerProfile(token);
        if (!profile) throw new Error("Unauthorized");

        // In a real application, you would integrate with SMS provider (e.g. Twilio)
        // Here we simulate OTP sending.
        console.log(`Simulated sending OTP to ${mobileNumber} for user ${profile.user_id}`);

        return { success: true, message: "OTP sent successfully" };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to send OTP" };
    }
}

export async function verifyMobileOtpAction(mobileNumber: string, otp: string) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("vos_access_token")?.value;
        if (!token) throw new Error("Unauthorized");
        const profile = await getFreelancerProfile(token);
        if (!profile) throw new Error("Unauthorized");

        // Hardcode "123456" as the mock correct OTP for demonstration purposes
        if (otp !== "123456") {
            throw new Error("Invalid OTP");
        }

        await approveMobileVerification(profile.user_id, mobileNumber);

        revalidatePath("/(vos-sync)/vos-sync/freelancer/verify-identity");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to verify OTP" };
    }
}
