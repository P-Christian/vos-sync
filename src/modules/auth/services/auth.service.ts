// src/modules/auth/services/auth.service.ts
import bcrypt from "bcrypt";
import * as jose from "jose";
import { getUserByEmail, createUser } from "./auth.repo";

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

    const secret = new TextEncoder().encode(JWT_SECRET);
    const alg = 'HS256';

    const token = await new jose.SignJWT({ 
        sub: String(newUser.user_id),
        email: newUser.user_email,
        role: newUser.role,
        role_id: newUser.role_id
    })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);

    return { newUser, token, role_id };
}
