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

    return token;
}

export async function registerUser(body: any) {
    const { email, password, firstName, lastName, contactNumber, role } = body;

    if (!email || !password || !firstName || !lastName || !contactNumber || !role) {
        throw new Error("Missing required fields.");
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
        throw new Error("Email is already registered.");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUserPayload = {
        user_email: email,
        hash_password: hashedPassword,
        user_fname: firstName,
        user_lname: lastName,
        user_contact: contactNumber,
        role: role,
        user_status: "Active"
    };

    const newUser = await createUser(newUserPayload);
    return newUser;
}
