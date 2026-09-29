import "server-only";

import * as jose from "jose";

import type { FreelancerProfile } from "../types/freelancer-profile.types";
import { fetchFreelancerProfileFromDirectus } from "./freelancer-profile.repo";
import { attachEducationVerification } from "./profile-education-verification";

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";

export async function getFreelancerProfile(token: string): Promise<FreelancerProfile | null> {
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    if (typeof payload.email !== "string") return null;

    const profile = await fetchFreelancerProfileFromDirectus(payload.email);
    return attachEducationVerification(profile);
  } catch (error: unknown) {
    console.error("Failed to verify token or fetch freelancer profile:", error);
    return null;
  }
}
