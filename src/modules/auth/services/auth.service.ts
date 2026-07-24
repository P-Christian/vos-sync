// src/modules/auth/services/auth.service.ts
import bcrypt from "bcrypt";
import * as jose from "jose";
import { getUserByEmail, createUser, updateUserOTP, getUserById, markOTPVerified, updateFailedAttempts, resetFailedAttempts, saveResetToken, clearResetToken, getRoleById } from "./auth.repo";
import { sendOTP, sendPasswordResetOTP } from "./email.service";
import { createAuditRecordRepo } from "@/modules/vos-admin/audit-trail";

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";
// ⚠️ TESTING: 1 min — CHANGE TO 15 * 60 * 1000 (15 min) FOR PRODUCTION
const LOCK_DURATION_MS = 1 * 60 * 1000;
// ⚠️ TESTING: 2 min — CHANGE TO 10 * 60 * 1000 (10 min) FOR PRODUCTION
const RESET_OTP_EXPIRY_MS = 2 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

// Format as Philippine Time (UTC+8) in YYYY-MM-DD HH:mm:ss
const getPHTimeString = (d: Date) => new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

export async function loginUser(email: string, hashPasswordParam: string) {
    if (!email || !hashPasswordParam) {
        throw new Error('Both "email" and "password" are required.');
    }

    const user = await getUserByEmail(email);
    if (!user) {
        // Log failed login attempt with unknown email
        createAuditRecordRepo({
            event_type: "USER_LOGIN_FAILED",
            event_category: "AUTHENTICATION",
            action: "FAILED_LOGIN",
            status: "FAILED",
            actor_type: "USER",
            reason: `Login attempt failed: Email ${email} not found`,
        });
        throw new Error("Credentials invalid.");
    }

    if (user.is_blocked) {
        createAuditRecordRepo({
            event_type: "USER_LOGIN_BLOCKED",
            event_category: "AUTHENTICATION",
            action: "FAILED_LOGIN",
            status: "DENIED",
            actor_type: "USER",
            actor_user_id: user.user_id,
            reason: "Login denied: Account is blocked",
        });
        throw new Error("Account is blocked. Contact support.");
    }

    const now = new Date();
    let currentAttempts = user.failed_attempts || 0;

    if (user.lock_until) {
        const lockUntilDate = new Date(user.lock_until);
        if (now < lockUntilDate) {
            createAuditRecordRepo({
                event_type: "USER_LOGIN_LOCKED",
                event_category: "AUTHENTICATION",
                action: "LOCKOUT",
                status: "DENIED",
                actor_type: "USER",
                actor_user_id: user.user_id,
                reason: `Login denied: Account locked until ${lockUntilDate.toISOString()}`,
            });
            throw new Error(`Account is locked. Try again at ${lockUntilDate.toLocaleTimeString()}.`);
        } else {
            // Lock has naturally expired. Give them a fresh set of attempts.
            currentAttempts = 0;
        }
    }

    const isValid = await bcrypt.compare(hashPasswordParam, user.hash_password);
    if (!isValid) {
        const newAttempts = currentAttempts + 1;
        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            const lockUntil = new Date(now.getTime() + LOCK_DURATION_MS).toISOString();
            await updateFailedAttempts(user.user_id, newAttempts, lockUntil);
            createAuditRecordRepo({
                event_type: "ACCOUNT_LOCKOUT",
                event_category: "AUTHENTICATION",
                action: "LOCKOUT",
                status: "DENIED",
                actor_type: "SYSTEM",
                actor_user_id: user.user_id,
                reason: `Account locked due to ${MAX_FAILED_ATTEMPTS} consecutive failed attempts`,
            });
            throw new Error("Account locked for 1 minute due to too many failed attempts.");
        } else {
            await updateFailedAttempts(user.user_id, newAttempts);
            const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
            createAuditRecordRepo({
                event_type: "USER_LOGIN_FAILED",
                event_category: "AUTHENTICATION",
                action: "FAILED_LOGIN",
                status: "FAILED",
                actor_type: "USER",
                actor_user_id: user.user_id,
                reason: `Invalid password. ${remaining} attempt(s) remaining`,
            });
            throw new Error(`Credentials invalid. ${remaining} attempt(s) remaining.`);
        }
    }

    // Login successful
    await resetFailedAttempts(user.user_id);

    createAuditRecordRepo({
        event_type: "USER_LOGIN",
        event_category: "AUTHENTICATION",
        action: "LOGIN",
        status: "SUCCESS",
        actor_type: user.role_id === 3 ? "ADMIN" : "USER",
        actor_user_id: user.user_id,
        organization_type: user.role_id === 2 ? "EMPLOYER" : user.role_id === 4 ? "SCHOOL" : "FREELANCER",
        reason: "User logged in successfully",
    });

    const secret = new TextEncoder().encode(JWT_SECRET);
    const alg = 'HS256';

    // Fetch clean role string from vs_roles table
    let cleanRoleName = user.role;
    try {
        const roleData = await getRoleById(user.role_id);
        if (roleData && roleData.role_name) {
            cleanRoleName = roleData.role_name;
        }
    } catch (e) {
        console.warn("Failed to fetch role details during login:", e);
    }

    const token = await new jose.SignJWT({ 
        sub: String(user.user_id),
        email: user.user_email,
        role: user.role,
        role_name: cleanRoleName,
        role_id: user.role_id
    })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);

    return { token, role_id: user.role_id };
}

export async function registerUser(body: unknown) {
    const { email, password, firstName, lastName, contact, role } = body as {
        email?: string;
        password?: string;
        firstName?: string;
        lastName?: string;
        contact?: string;
        role?: string;
    };

    if (!email || !password || !firstName || !lastName || !contact || !role) {
        throw new Error("Missing required fields.");
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
        throw new Error("Email is already registered.");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let role_id = 1; // Default to FREELANCER
    if (String(role).toUpperCase() === 'EMPLOYER' || String(role).toUpperCase() === 'CLIENT') {
        role_id = 2;
    }

    const newUserPayload = {
        user_email: email,
        hash_password: hashedPassword,
        user_password: password,
        user_fname: firstName,
        user_lname: lastName,
        user_contact: contact,
        role: String(role).toUpperCase(),
        role_id: role_id,
        user_status: "Active"
    };

    const newUser = await createUser(newUserPayload);

    createAuditRecordRepo({
        event_type: "USER_REGISTERED",
        event_category: "USER",
        action: "CREATE",
        status: "SUCCESS",
        actor_type: "USER",
        actor_user_id: newUser.user_id,
        resource_type: "vs_user",
        resource_id: String(newUser.user_id),
        organization_type: role_id === 2 ? "EMPLOYER" : "FREELANCER",
        reason: `New user registration for ${email}`,
    });

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    
    const now = new Date();
    const expiry = new Date(now.getTime() + 10 * 60 * 1000);

    const otpSentAt = getPHTimeString(now);
    const otpExpiry = getPHTimeString(expiry);

    await updateUserOTP(newUser.user_id, otpCode, otpExpiry, otpSentAt);
    await sendOTP(email, otpCode);

    return { requireOtp: true, userId: newUser.user_id };
}

export async function confirmOTP(userId: string | number, code: string) {
    if (!userId || !code) {
        throw new Error('User ID and OTP code are required.');
    }

    const user = await getUserById(userId);
    if (!user) {
        throw new Error('User not found.');
    }

    if (String(user.otp_code) !== String(code)) {
        createAuditRecordRepo({
            event_type: "OTP_VERIFY_FAILED",
            event_category: "AUTHENTICATION",
            action: "OTP_VERIFY",
            status: "FAILED",
            actor_type: "USER",
            actor_user_id: Number(userId),
            reason: "Invalid OTP code entered",
        });
        throw new Error('Invalid verification code.');
    }

    // Validate expiry using pure string comparison against current PH Time
    const expiryStr = String(user.otp_expiry).replace('T', ' ').substring(0, 19);
    const nowPH = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    if (expiryStr < nowPH) {
        createAuditRecordRepo({
            event_type: "OTP_VERIFY_EXPIRED",
            event_category: "AUTHENTICATION",
            action: "OTP_VERIFY",
            status: "FAILED",
            actor_type: "USER",
            actor_user_id: Number(userId),
            reason: "Expired OTP code submitted",
        });
        throw new Error('Verification code has expired.');
    }

    await markOTPVerified(userId);

    createAuditRecordRepo({
        event_type: "OTP_VERIFY_SUCCESS",
        event_category: "AUTHENTICATION",
        action: "OTP_VERIFY",
        status: "SUCCESS",
        actor_type: "USER",
        actor_user_id: Number(userId),
        reason: "OTP verification completed successfully",
    });

    const secret = new TextEncoder().encode(JWT_SECRET);
    const alg = 'HS256';

    // Fetch clean role string from vs_roles table
    let cleanRoleName = user.role;
    try {
        const roleData = await getRoleById(user.role_id);
        if (roleData && roleData.role_name) {
            cleanRoleName = roleData.role_name;
        }
    } catch (e) {
        console.warn("Failed to fetch role details during OTP confirmation:", e);
    }

    const token = await new jose.SignJWT({ 
        sub: String(user.user_id),
        email: user.user_email,
        user_fname: user.user_fname,
        user_lname: user.user_lname,
        role: user.role,
        role_name: cleanRoleName,
        role_id: user.role_id
    })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);

    return { token, role_id: user.role_id };
}

export async function requestPasswordReset(email: string) {
    const user = await getUserByEmail(email);
    if (!user) {
        // Silent success: Do not reveal if email exists
        return { ok: true, userId: null };
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const now = new Date();
    const expiry = new Date(now.getTime() + RESET_OTP_EXPIRY_MS);
    
    const otpExpiryPH = getPHTimeString(expiry);
    
    const saltRounds = 10;
    const hashedOtp = await bcrypt.hash(otpCode, saltRounds);
    
    // Use crypto.randomUUID() if available, else standard JS random
    const tokenId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    
    await saveResetToken(user.user_id, tokenId, hashedOtp, otpExpiryPH);
    await sendPasswordResetOTP(email, otpCode);

    createAuditRecordRepo({
        event_type: "PASSWORD_RESET_REQUESTED",
        event_category: "AUTHENTICATION",
        action: "PASSWORD_RESET",
        status: "SUCCESS",
        actor_type: "USER",
        actor_user_id: user.user_id,
        reason: "Password reset OTP requested",
    });
    
    return { ok: true, userId: user.user_id };
}

export async function confirmPasswordReset(userId: string | number, code: string, newPassword: string) {
    if (!userId || !code || !newPassword) {
        throw new Error('User ID, OTP code, and new password are required.');
    }

    const user = await getUserById(userId);
    if (!user) {
        throw new Error('User not found.');
    }
    
    if (!user.reset_token_hash) {
        throw new Error('No password reset requested.');
    }
    
    const isValid = await bcrypt.compare(code, user.reset_token_hash);
    if (!isValid) {
        createAuditRecordRepo({
            event_type: "PASSWORD_RESET_FAILED",
            event_category: "AUTHENTICATION",
            action: "PASSWORD_RESET",
            status: "FAILED",
            actor_type: "USER",
            actor_user_id: Number(userId),
            reason: "Invalid password reset code submitted",
        });
        throw new Error('Invalid or expired code.');
    }

    // Validate expiry
    const expiryStr = String(user.reset_token_expiry).replace('T', ' ').substring(0, 19);
    const nowPH = getPHTimeString(new Date());

    if (expiryStr < nowPH) {
        createAuditRecordRepo({
            event_type: "PASSWORD_RESET_EXPIRED",
            event_category: "AUTHENTICATION",
            action: "PASSWORD_RESET",
            status: "FAILED",
            actor_type: "USER",
            actor_user_id: Number(userId),
            reason: "Expired password reset code submitted",
        });
        throw new Error('Reset code has expired.');
    }
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await clearResetToken(userId, hashedPassword, newPassword);

    createAuditRecordRepo({
        event_type: "PASSWORD_RESET_COMPLETED",
        event_category: "AUTHENTICATION",
        action: "PASSWORD_RESET",
        status: "SUCCESS",
        actor_type: "USER",
        actor_user_id: Number(userId),
        reason: "Password reset completed successfully",
    });

    return { ok: true };
}

