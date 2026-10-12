# Implementation Plan: Google Sign-In Integration with Security & Vulnerability Controls

## 1. Executive Summary & Core Objective

Integrate Google Sign-In into the VoSync login and signup forms with strict database verification (`vs_user`), resilient OAuth 2.0 / OIDC security controls, and an extensible architecture for future social providers (Facebook, Apple, LinkedIn).

---

## 2. Configuration & Environment

The implementation relies strictly on server-side environment variables:
- `GOOGLE_CLIENT`: Google OAuth 2.0 Web Client ID.
- `GOOGLE_SECRET`: Google OAuth 2.0 Client Secret (server-side only, never leaked to client bundles).
- `JWT_SECRET`: Secret key used for signing/encrypting VoSync session tokens (`vos_sync_access_token`) and OAuth/registration transactions.
- `GOOGLE_REDIRECT_URI` (optional): Explicit canonical redirect URI override.

> **Constraint**: Per project safety rules, `.env.local` is never modified by the agent.

---

## 3. Strict Callback Configuration & Host Matching

To prevent host-header attacks or redirect mismatches:
1. **Single Canonical Callback Path**: `/api/auth/google/callback` is the only supported callback path. The `/auth/google` alternative is removed to keep the contract canonical and deterministic.
2. **Exact Allowlist Resolution**:
   - `https://desktop-1al8ql9.tail054015.ts.net/api/auth/google/callback`
   - `https://ubuntuserver1.tail054015.ts.net/api/auth/google/callback`
   - *(Optional local fallback: `http://localhost:3000/api/auth/google/callback` in development)*
3. **Strict Validation**: The incoming host is checked against these exact allowlisted hostnames. If no match is found, the request is immediately rejected with HTTP 400 Bad Request ("Untrusted host header"). Unverified or arbitrary host headers are never trusted.

---

## 4. UI Specifications & Extensible Architecture

### 4.1 Layout & Visual Structure
- **Divider**: A clean `"OR CONTINUE WITH"` section placed between the primary form action and social auth buttons, styled with semantic tokens (`border-border`, `text-muted-foreground`, `text-xs uppercase tracking-wider`).
- **Button Row**: Centered horizontal row with `gap-3` or `gap-4`.
- **Button Specs**:
  - Size: 48px square (`h-12 w-12`).
  - Shape: Rounded rectangle (`rounded-lg` or `rounded-xl`) matching existing inputs.
  - Sizing & Centering: Flex container, centered icon (20–24px).
  - Colors & States: Semantic tokens (`border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground`).
  - Accessibility: `focus-visible:ring-2 focus-visible:ring-ring`, `aria-label="Continue with Google"`.
  - Icon: Standalone, clean SVG asset for Google (no external images).

### 4.2 Extensible Provider Architecture
Dedicated reusable component: `src/modules/auth/components/SocialAuthButtons.tsx`

```typescript
export type AuthProviderId = "google" | "facebook" | "apple" | "linkedin";

export interface AuthProviderConfig {
  id: AuthProviderId;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  href?: string;
  onClick?: () => void;
}
```
- Only providers with `enabled: true` are rendered.
- Google is enabled initially; Facebook, Apple, and LinkedIn remain configurable placeholders (`enabled: false`).
- Reused across both `/login` and `/signup`.

---

## 5. OIDC, OAuth 2.0 & Replay Mitigation Controls

### 5.1 Separation of OAuth `state` and OIDC `nonce` with Server-Side Replay Defense
- **`state`**: Protects the authorization transaction against CSRF (32 bytes cryptographically secure hex).
- **`nonce`**: Cryptographically binds the returned Google ID token to the specific authentication request (32 bytes hex).
- **PKCE `code_verifier`**: High-entropy cryptographic string with `S256` challenge.
- **Atomic Single-Use Enforcement**:
  - `state`, `nonce`, and `code_verifier` are bound into a signed, short-lived (5-minute TTL) `HttpOnly`, `SameSite=Lax` transaction cookie (`vos_sync_oauth_tx`) with a unique `jti`.
  - The server tracks consumed transaction `jti`s in an atomic server-side memory store with automatic eviction after TTL.
  - If a `jti` has already been consumed, the transaction is immediately rejected with HTTP 400.
  - The cookie is deleted immediately after validation. In addition, Google's authorization code exchange is single-use (`invalid_grant` on replay).

### 5.2 Strict Google Identity Verification (OIDC with `jose`)
1. Cryptographically verify `id_token` against Google’s official Remote JWKS (`https://www.googleapis.com/oauth2/v3/certs`) via `jose.createRemoteJWKSet`:
   - **Signature Verification**: Validated using Google's public JWKS.
   - **Issuer (`iss`) Allowlist**: Strictly must match `'https://accounts.google.com'` or `'accounts.google.com'`.
   - **Audience (`aud`)**: Strictly must match `process.env.GOOGLE_CLIENT`.
   - **Expiration (`exp`)**: Enforced by `jose.jwtVerify`.
   - **Nonce Verification**: Explicitly verify `payload.nonce === transaction.nonce`.
   - **Email Verification**: Strictly require `payload.email_verified === true`. Reject unverified or missing email claims.

### 5.3 Account Matching & Linking Policy
- **Email Normalization**: Emails from Google are normalized (`email.trim().toLowerCase()`) before querying `vs_user`.
- **Existing Accounts**:
  - If a user exists in `vs_user`:
    - Check `user.is_blocked !== true` and execute `canAuthenticate(user)`. If blocked or inactive, authentication is rejected with 403.
    - No existing credentials or password hashes are overwritten, deleted, or silently modified.
    - Google's `sub` claim is treated as the stable external identity.
    - Reset failed attempts (`resetFailedAttempts`) and issue authenticated session (`issueAuthSession`).

### 5.4 Confidential Incomplete Registration with Atomic Consumption
- **Zero Profile Data in URLs**: No profile data appears in query strings.
- **Authenticated Encryption (JWE `A256GCM`)**:
  - When a Google user is not in `vs_user`:
  - Profile data (`email`, `given_name`, `family_name`, `sub`) is encrypted using JWE (`A256GCM`) into an opaque token in an `HttpOnly`, `SameSite=Lax`, `secure: process.env.NODE_ENV === "production"` cookie (`vos_sync_google_reg`).
  - Contains explicit purpose (`purpose: "google-registration"`), 15-minute TTL, and unique `jti`.
  - Server marks `jti` as consumed upon registration submission to prevent replay.
  - The signup form pre-fills name and locks the email as read-only ("Verified via Google").
  - The registration token never grants authenticated dashboard access or allows selecting privileged roles (`ADMIN`).

### 5.5 Session Security & Fail-Safe Audit Logging
- Reuses `issueAuthSession(user)` (`HS256`, 7-day expiration).
- Cookie `vos_sync_access_token`: `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`.
- Audit logs via `createAuditRecordRepo` with Philippine ISO timestamp (UTC+8).
- Audit system failures fail safely and never grant unauthorized access.
- Successful login is only reported after identity verification, account checks, and session issuance have all succeeded.
- Zero credentials, authorization codes, or tokens are written to logs.

---

## 6. End-to-End Execution Sequence

1. **Inspect Interfaces**: Check signatures of `getUserByEmail`, `canAuthenticate`, `issueAuthSession`, and `createAuditRecordRepo`.
2. **Build Component**: Create `src/modules/auth/components/SocialAuthButtons.tsx`.
3. **Build OAuth Handlers**:
   - `src/modules/auth/google/google.service.ts`: Helper with state/nonce generation, JWKS validation, PKCE, and server-side replay store.
   - `GET /api/auth/google`: Initiates flow with strict allowlist matching.
   - `GET /api/auth/google/callback`: Consumes transaction, validates ID token, verifies `vs_user`, and redirects.
4. **Integrate with Forms**: Add `SocialAuthButtons` to `/login` and `/signup`.
5. **Verify & Test**: Check TypeScript compilation and test error handling.
6. **Documentation**: Update `README.md` and `progress_report.md`.

---

## 7. Implementation Acceptance Criteria

- [ ] Existing email/password login and OTP flows continue to function without regression.
- [ ] Google OAuth callback strictly verifies ID token signature against Google JWKS, `iss`, `aud`, `exp`, `nonce`, and `email_verified === true`.
- [ ] Callback resolution strictly matches exact allowlist (`desktop-1al8ql9.tail054015.ts.net` and `ubuntuserver1.tail054015.ts.net`).
- [ ] Independent `state` and `nonce` are generated, validated once, and protected against replay.
- [ ] Blocked and inactive accounts are denied authentication and logged appropriately.
- [ ] Incomplete registration data is encrypted via JWE (`A256GCM`) with single-use atomic consumption.
- [ ] Session cookie uses `secure: process.env.NODE_ENV === "production"`, `httpOnly: true`, and `sameSite: "lax"`.
- [ ] Audit failures fail safe and never grant access.
- [ ] Timestamps adhere to Philippine local device time (UTC+8).
- [ ] Reusable `SocialAuthButtons` component renders on `/login` and `/signup`.
- [ ] `README.md` and `progress_report.md` updated upon completion.
