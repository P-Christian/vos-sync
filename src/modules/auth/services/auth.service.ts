// src/modules/auth/services/auth.service.ts
import bcrypt from "bcrypt";
import * as jose from "jose";
import { getUserByEmail, createUser, updateUserOTP, getUserById, markOTPVerified } from "./auth.repo";
import { sendOTP } from "./email.service";

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";

export async function loginUser(email: string, hashPasswordParam: string) {
    if (!email || !hashPasswordParam) {
        throw new Error('Both "email" and "password" are required.');
    }

    const user = await getUserByEmail(email);
    if (!user) {
        throw new Error("Credentials invalid.");
    }

    const isValid = await bcrypt.compare(hashPasswordParam, user.hash_password);
    if (!isValid) {
        throw new Error("Credentials invalid.");
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const alg = 'HS256';

    const token = await new jose.SignJWT({ 
        sub: String(user.user_id),
        email: user.user_email,
        role: user.role
    })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);

    return { token, role_id: user.role_id };
}

export async function registerUser(body: unknown) {
    const { email, password, firstName, lastName, contact, role } = body as any;

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
        user_fname: firstName,
        user_lname: lastName,
        user_contact: contact,
        role: String(role).toUpperCase(),
        role_id: role_id,
        user_status: "Active"
    };

    const newUser = await createUser(newUserPayload);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Format as Philippine Time (UTC+8) in YYYY-MM-DD HH:mm:ss
    const getPHTimeString = (d: Date) => new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    
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
        throw new Error('Invalid verification code.');
    }

    // Validate expiry using pure string comparison against current PH Time
    const expiryStr = String(user.otp_expiry).replace('T', ' ').substring(0, 19);
    const nowPH = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    if (expiryStr < nowPH) {
        throw new Error('Verification code has expired.');
    }

    await markOTPVerified(userId);

    const secret = new TextEncoder().encode(JWT_SECRET);
    const alg = 'HS256';

    const token = await new jose.SignJWT({ 
        sub: String(user.user_id),
        email: user.user_email,
        role: user.role,
        role_id: user.role_id
    })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);

    return { token, role_id: user.role_id };
}
