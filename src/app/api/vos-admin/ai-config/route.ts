// src/app/api/vos-admin/ai-config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticated-session";
import {
  getAiSystemConfig,
  saveProviderConfig,
  registerOrUpdateModel,
  saveWorkloadRouting,
  getDecryptedProviderCredentials,
} from "@/lib/ai/aiConfigStore";
import { getProviderAdapter } from "@/lib/ai/adapters";
import { AiProviderId, RegisteredModel, WorkloadRoutingRule } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Authorize caller as Administrator (Role ID 3 or ADMIN role) */
async function authorizeAdmin(req: NextRequest) {
  const session = await authenticateRequest(req);
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  const roleName = (session.roleName || "").toUpperCase();
  if (session.roleId !== 3 && roleName !== "ADMIN") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden: Restricted to administrators." },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, session };
}

const OFFICIAL_PROVIDER_DOMAINS: Partial<Record<AiProviderId, string[]>> = {
  google: ["generativelanguage.googleapis.com"],
  openai: ["api.openai.com"],
  anthropic: ["api.anthropic.com"],
  mistral: ["api.mistral.ai"],
};

/**
 * Validate and sanitize endpoint base URLs.
 * Mitigates SSRF and credential exfiltration against metadata or internal services.
 */
function validateBaseUrl(
  urlStr: string | undefined,
  providerId: AiProviderId
): { valid: boolean; error?: string; cleanUrl?: string } {
  if (!urlStr || !urlStr.trim()) {
    return { valid: true, cleanUrl: "" };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr.trim());
  } catch {
    return { valid: false, error: "Invalid URL format." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Only http and https protocols are supported." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block cloud metadata services and instance metadata IPs
  if (
    hostname === "169.254.169.254" ||
    hostname === "metadata.google.internal" ||
    hostname === "instance-data"
  ) {
    return { valid: false, error: "Access to cloud metadata endpoints is prohibited." };
  }

  // Local/custom self-hosted AI models
  if (providerId === "ollama" || providerId === "local_custom") {
    return { valid: true, cleanUrl: parsed.origin };
  }

  // Cloud providers must use https and official domains
  if (parsed.protocol !== "https:") {
    return { valid: false, error: "Cloud AI providers require https." };
  }

  const allowedDomains = OFFICIAL_PROVIDER_DOMAINS[providerId];
  if (allowedDomains && !allowedDomains.includes(hostname)) {
    return {
      valid: false,
      error: `Invalid domain '${hostname}' for ${providerId}. Expected: ${allowedDomains.join(", ")}`,
    };
  }

  return { valid: true, cleanUrl: parsed.origin };
}

export async function GET(req: NextRequest) {
  const auth = await authorizeAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const config = getAiSystemConfig(true); // Return masked credentials only
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load AI system configuration.", details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const action = body.action;

    switch (action) {
      case "save_provider": {
        const { providerId, baseUrl, apiKey, isActive } = body;
        if (!providerId) {
          return NextResponse.json({ error: "Missing providerId." }, { status: 400 });
        }

        const urlValidation = validateBaseUrl(baseUrl, providerId as AiProviderId);
        if (!urlValidation.valid) {
          return NextResponse.json({ error: urlValidation.error }, { status: 400 });
        }

        saveProviderConfig(providerId as AiProviderId, {
          baseUrl: urlValidation.cleanUrl || baseUrl,
          rawApiKey: apiKey,
          isActive,
        });

        const updated = getAiSystemConfig(true);
        return NextResponse.json({ success: true, config: updated });
      }

      case "test_provider": {
        const { providerId, modelId, tempApiKey, tempBaseUrl } = body;
        if (!providerId) {
          return NextResponse.json({ error: "Missing providerId." }, { status: 400 });
        }

        const urlValidation = validateBaseUrl(tempBaseUrl, providerId as AiProviderId);
        if (!urlValidation.valid) {
          return NextResponse.json({ error: urlValidation.error }, { status: 400 });
        }

        const storedCreds = getDecryptedProviderCredentials(providerId as AiProviderId);

        // Security safeguard: If testing against a non-standard custom URL, require explicit testApiKey
        const isCustomBaseUrl =
          tempBaseUrl &&
          storedCreds.baseUrl &&
          tempBaseUrl.trim().replace(/\/+$/, "") !== storedCreds.baseUrl.trim().replace(/\/+$/, "");

        if (isCustomBaseUrl && !tempApiKey) {
          return NextResponse.json(
            {
              error:
                "Testing against a custom base URL requires providing an explicit temporary API key. Stored production credentials cannot be dispatched to custom destinations.",
            },
            { status: 400 }
          );
        }

        const effectiveCreds = {
          apiKey: tempApiKey || storedCreds.apiKey,
          baseUrl: urlValidation.cleanUrl || tempBaseUrl || storedCreds.baseUrl,
        };

        const adapter = getProviderAdapter(providerId as AiProviderId);
        const testResult = await adapter.testConnection(effectiveCreds, modelId);

        // Update provider health in store
        saveProviderConfig(providerId as AiProviderId, {
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: testResult.ok ? "OK" : "ERROR",
          lastTestLatencyMs: testResult.latencyMs,
          lastTestError: testResult.error || null,
        });

        return NextResponse.json(testResult);
      }

      case "discover_models": {
        const { providerId, tempApiKey, tempBaseUrl } = body;
        if (!providerId) {
          return NextResponse.json({ error: "Missing providerId." }, { status: 400 });
        }

        const urlValidation = validateBaseUrl(tempBaseUrl, providerId as AiProviderId);
        if (!urlValidation.valid) {
          return NextResponse.json({ error: urlValidation.error }, { status: 400 });
        }

        const storedCreds = getDecryptedProviderCredentials(providerId as AiProviderId);

        const isCustomBaseUrl =
          tempBaseUrl &&
          storedCreds.baseUrl &&
          tempBaseUrl.trim().replace(/\/+$/, "") !== storedCreds.baseUrl.trim().replace(/\/+$/, "");

        if (isCustomBaseUrl && !tempApiKey) {
          return NextResponse.json(
            {
              error:
                "Discovering models against a custom base URL requires providing an explicit temporary API key.",
            },
            { status: 400 }
          );
        }

        const effectiveCreds = {
          apiKey: tempApiKey || storedCreds.apiKey,
          baseUrl: urlValidation.cleanUrl || tempBaseUrl || storedCreds.baseUrl,
        };

        const adapter = getProviderAdapter(providerId as AiProviderId);
        const models = await adapter.discoverModels(effectiveCreds);

        return NextResponse.json({ success: true, count: models.length, models });
      }

      case "register_model": {
        const { model } = body as { model: RegisteredModel };
        if (!model || !model.id || !model.provider) {
          return NextResponse.json({ error: "Invalid model definition." }, { status: 400 });
        }

        registerOrUpdateModel(model);
        const updated = getAiSystemConfig(true);
        return NextResponse.json({ success: true, config: updated });
      }

      case "save_routing": {
        const { workloadRouting, globalFailoverEnabled, localAiOnlyMode } = body as {
          workloadRouting: Record<string, WorkloadRoutingRule>;
          globalFailoverEnabled?: boolean;
          localAiOnlyMode?: boolean;
        };

        saveWorkloadRouting(workloadRouting, {
          globalFailoverEnabled,
          localAiOnlyMode,
        });

        const updated = getAiSystemConfig(true);
        return NextResponse.json({ success: true, config: updated });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error.", details: String(err) },
      { status: 500 }
    );
  }
}
