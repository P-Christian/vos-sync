import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { sendOtpEmail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DirectusResponse {
  data?: {
    user_id?: number;
    company_id?: number;
    [key: string]: unknown;
  };
  errors?: Array<{
    message: string;
    [key: string]: unknown;
  }>;
}

// ─────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

function validateContact(contact: string): boolean {
  // PH mobile: 09XXXXXXXXX or +639XXXXXXXXX
  return /^(09|\+639)\d{9}$/.test(contact.trim());
}

function validatePassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8;
}

function required(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

// ─────────────────────────────────────────────
// POST HANDLER
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let payload: {
    account?: {
      user_email?: string;
      [key: string]: unknown;
    };
    company?: Record<string, unknown>;
    address?: Record<string, unknown>;
    terms_accepted?: boolean;
    privacy_accepted?: boolean;
    [key: string]: unknown;
  } | null = null;

  try {
    payload = await req.json().catch(() => null);

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid registration payload." },
        { status: 400 }
      );
    }

    const { account, company, address } = payload as {
      account: Record<string, unknown>;
      company: Record<string, unknown>;
      address: Record<string, unknown>;
    };

    // ─────────────────────────────────────────
    // 1. ACCOUNT FIELD VALIDATIONS
    // ─────────────────────────────────────────
    const validationErrors: string[] = [];

    if (!required(account?.user_fname))
      validationErrors.push("First name is required.");

    if (!required(account?.user_lname))
      validationErrors.push("Last name is required.");

    const email = String(account?.user_email ?? "").trim().toLowerCase();
    if (!email) {
      validationErrors.push("Email address is required.");
    } else if (!validateEmail(email)) {
      validationErrors.push("Email address format is invalid.");
    }

    const contact = String(account?.user_contact ?? "").trim();
    if (!contact) {
      validationErrors.push("Contact number is required.");
    } else if (!validateContact(contact)) {
      validationErrors.push(
        "Contact number must be a valid PH mobile format (09XXXXXXXXX or +639XXXXXXXXX)."
      );
    }

    const password = String(account?.password ?? "");
    if (!password) {
      validationErrors.push("Password is required.");
    } else if (!validatePassword(password)) {
      validationErrors.push("Password must be at least 8 characters.");
    }

    const confirmPassword = String(account?.confirmPassword ?? "");
    if (password && confirmPassword !== password) {
      validationErrors.push("Password and confirm password do not match.");
    }

    // ─────────────────────────────────────────
    // 2. TERMS & PRIVACY VALIDATION
    // ─────────────────────────────────────────
    if (!payload.terms_accepted) {
      validationErrors.push(
        "You must accept the Terms and Conditions to register."
      );
    }
    if (!payload.privacy_accepted) {
      validationErrors.push(
        "You must accept the Privacy Policy to register."
      );
    }

    // ─────────────────────────────────────────
    // 3. COMPANY FIELD VALIDATIONS
    // ─────────────────────────────────────────
    if (!required(company?.company_name))
      validationErrors.push("Company name is required.");

    if (!required(company?.industry))
      validationErrors.push("Industry is required.");

    if (!required(address?.company_province))
      validationErrors.push("Province is required.");

    if (!required(address?.company_city))
      validationErrors.push("City is required.");

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join(" ") },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────
    // 4. DIRECTUS SETUP
    // ─────────────────────────────────────────
    const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
      /\/$/,
      ""
    );
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Directus API base URL is not configured." },
        { status: 500 }
      );
    }

    const getHeaders = () => {
      const h: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (DIRECTUS_TOKEN) {
        h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
      }
      return h;
    };

    // PH Time helper (UTC+8)
    const phNow = () =>
      new Date(Date.now() + 8 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

    // ─────────────────────────────────────────
    // 5. DUPLICATE EMAIL CHECK
    // ─────────────────────────────────────────
    const checkUserUrl = `${DIRECTUS_BASE}/items/vs_user?filter[user_email][_eq]=${encodeURIComponent(email)}&fields=*`;
    const checkRes = await fetch(checkUserUrl, {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!checkRes.ok) {
      return NextResponse.json(
        { error: "Failed to check existing user status." },
        { status: checkRes.status }
      );
    }

    const checkJson = await checkRes.json();
    const existingUsers = checkJson.data;
    const userExists =
      Array.isArray(existingUsers) && existingUsers.length > 0;

    if (userExists) {
      const existingUser = existingUsers[0];

      // Already verified → block
      if (existingUser.otp_verified == 1 || existingUser.otp_verified === true) {
        return NextResponse.json(
          {
            error:
              "Email address is already registered. Please sign in or reset your password.",
          },
          { status: 409 }
        );
      }

      // Unverified → regenerate OTP (resend flow)
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(
        Date.now() + 8 * 60 * 60 * 1000 + 15 * 60 * 1000
      )
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      const otpHashDisabled = process.env.OTP_HASH_DISABLED === "true";
      const saltRounds = 10;
      const storedOtp = otpHashDisabled
        ? generatedOtp
        : await bcrypt.hash(generatedOtp, saltRounds);

      const updateRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_user/${existingUser.user_id}`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            otp_code: storedOtp,
            otp_expiry: otpExpiry,
            otp_sent_at: phNow(),
          }),
        }
      );

      if (!updateRes.ok) {
        return NextResponse.json(
          { error: "Failed to resend verification code." },
          { status: updateRes.status }
        );
      }

      // Direct OTP email dispatch via nodemailer
      try {
        await sendOtpEmail(email, generatedOtp);
      } catch (e) {
        console.error("Nodemailer OTP dispatch failed (resend):", e);
      }

      console.log(`[RESEND OTP] Email: ${email} | OTP: ${generatedOtp}`);

      return NextResponse.json({
        success: true,
        message: "Verification code resent successfully.",
        otp_sent: true,
        email,
        otp_code:
          process.env.NEXT_PUBLIC_AUTH_DISABLED === "true"
            ? generatedOtp
            : undefined,
      });
    }

    // ─────────────────────────────────────────
    // 6. GENERATE OTP + HASH PASSWORD
    // ─────────────────────────────────────────
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(
      Date.now() + 8 * 60 * 60 * 1000 + 15 * 60 * 1000
    )
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    const nowPH = phNow();

    const otpHashDisabled = process.env.OTP_HASH_DISABLED === "true";
    const saltRounds = 10;
    const hashedPw = await bcrypt.hash(password, saltRounds);
    const hashedOtp = otpHashDisabled
      ? generatedOtp
      : await bcrypt.hash(generatedOtp, saltRounds);

    // ─────────────────────────────────────────
    // 7. CREATE VS_USER (Transaction Step 1)
    // ─────────────────────────────────────────
    const userPayload = {
      user_email: email,
      user_fname: String(account.user_fname ?? "").trim(),
      user_mname: String(account.user_mname ?? "").trim() || null,
      user_lname: String(account.user_lname ?? "").trim(),
      suffix_name: String(account.suffix_name ?? "").trim() || null,
      user_contact: contact,
      role_id: 2,
      role: "CLIENT",
      hash_password: hashedPw,
      user_password: hashedPw, // legacy compat
      otp_code: hashedOtp,
      otp_expiry: otpExpiry,
      otp_verified: 0,
      otp_sent_at: nowPH,
      terms_accepted_at: nowPH,
      privacy_accepted_at: nowPH,
    };

    const userRes = await fetch(`${DIRECTUS_BASE}/items/vs_user`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(userPayload),
    });

    const userText = await userRes.text();
    let userData: DirectusResponse | null = null;
    try {
      userData = userText ? JSON.parse(userText) : null;
    } catch {
      userData = null;
    }

    if (!userRes.ok) {
      const err =
        userData?.errors?.[0]?.message ||
        userText ||
        "Failed to create user record.";
      return NextResponse.json({ error: err }, { status: userRes.status });
    }

    const userId = userData?.data?.user_id;
    if (!userId) {
      return NextResponse.json(
        { error: "Failed to retrieve user ID after creation." },
        { status: 500 }
      );
    }

    // ─────────────────────────────────────────
    // 8. CREATE VS_COMPANY (Transaction Step 2)
    // ─────────────────────────────────────────
    const slugify = (text: string) =>
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");

    const companyCode = `${slugify(
      String(company.company_name ?? "")
    ).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const companyPayload = {
      company_code: companyCode,
      company_name: String(company.company_name ?? "").trim(),
      company_email: String(company.company_email ?? "").trim() || null,
      company_contact: String(company.company_contact ?? "").trim() || null,
      industry: String(company.industry ?? "").trim(),
      business_type: String(company.business_type ?? "").trim() || null,
      company_size: String(company.company_size ?? "").trim() || null,
      company_website: String(company.company_website ?? "").trim() || null,
      company_description:
        String(company.company_description ?? "").trim() || null,
      company_province: String(address.company_province ?? "").trim(),
      company_city: String(address.company_city ?? "").trim(),
      company_brgy: String(address.company_brgy ?? "").trim() || null,
      company_address: String(address.company_address ?? "").trim() || null,
      company_zipCode: String(address.company_zipCode ?? "").trim() || null,
      verification_status: "PENDING",
      is_active: 1,
      is_deleted: 0,
      created_by_user_id: userId,
    };

    const companyRes = await fetch(`${DIRECTUS_BASE}/items/vs_company`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(companyPayload),
    });

    const companyText = await companyRes.text();
    let companyData: DirectusResponse | null = null;
    try {
      companyData = companyText ? JSON.parse(companyText) : null;
    } catch {
      companyData = null;
    }

    if (!companyRes.ok) {
      // ROLLBACK: delete user
      await fetch(`${DIRECTUS_BASE}/items/vs_user/${userId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const err =
        companyData?.errors?.[0]?.message ||
        companyText ||
        "Failed to create company record. Registration rolled back.";
      return NextResponse.json({ error: err }, { status: companyRes.status });
    }

    const companyId = companyData?.data?.company_id;
    if (!companyId) {
      // ROLLBACK: delete user
      await fetch(`${DIRECTUS_BASE}/items/vs_user/${userId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return NextResponse.json(
        { error: "Failed to retrieve company ID. Registration rolled back." },
        { status: 500 }
      );
    }

    // ─────────────────────────────────────────
    // 9. CREATE VS_COMPANY_USER (Transaction Step 3)
    // ─────────────────────────────────────────
    const linkPayload = {
      company_id: companyId,
      user_id: userId,
      company_user_role: "OWNER",
      is_primary_contact: 1,
      status: "ACTIVE",
    };

    const linkRes = await fetch(`${DIRECTUS_BASE}/items/vs_company_user`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(linkPayload),
    });

    const linkText = await linkRes.text();
    let linkData: DirectusResponse | null = null;
    try {
      linkData = linkText ? JSON.parse(linkText) : null;
    } catch {
      linkData = null;
    }

    if (!linkRes.ok) {
      // ROLLBACK: delete company + user
      await fetch(`${DIRECTUS_BASE}/items/vs_company/${companyId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      await fetch(`${DIRECTUS_BASE}/items/vs_user/${userId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const err =
        linkData?.errors?.[0]?.message ||
        linkText ||
        "Failed to link user and company. Registration rolled back.";
      return NextResponse.json({ error: err }, { status: linkRes.status });
    }

    // ─────────────────────────────────────────
    // 10. SEND OTP EMAIL via Nodemailer
    // ─────────────────────────────────────────
    try {
      await sendOtpEmail(email, generatedOtp);
    } catch (e) {
      console.error("Nodemailer OTP dispatch failed (new user):", e);
    }

    console.log(`[SIGNUP OTP] Email: ${email} | OTP: ${generatedOtp}`);

    return NextResponse.json({
      success: true,
      message:
        "Registration successful. Please verify your email to activate your account.",
      otp_sent: true,
      email,
      otp_code:
        process.env.NEXT_PUBLIC_AUTH_DISABLED === "true"
          ? generatedOtp
          : undefined,
    });
  } catch (error: unknown) {
    console.error("API Route Registration Error:", error);
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
      return NextResponse.json({
        success: true,
        message: "Registration successful (Mock fallback on error)",
        otp_sent: true,
        email: payload?.account?.user_email || "test@company.com",
        otp_code: "123456",
      });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

