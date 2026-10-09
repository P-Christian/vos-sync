// src/lib/ai/types.ts
// Single source of truth for multi-provider AI adapters, registry, and workloads.

export type AiProviderId = "google" | "openai" | "anthropic" | "mistral" | "ollama" | "local_custom";

export interface ProviderMetadata {
  id: AiProviderId;
  name: string;
  defaultBaseUrl: string;
  requiresApiKey: boolean;
  supportsModelDiscovery: boolean;
  docUrl: string;
}

export interface StoredProviderConfig {
  id: AiProviderId;
  name: string;
  baseUrl: string;
  encryptedApiKey?: string;
  maskedApiKey?: string;
  isActive: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: "OK" | "ERROR" | null;
  lastTestLatencyMs?: number | null;
  lastTestError?: string | null;
}

export interface DiscoveredModel {
  id: string;
  name: string;
  provider: AiProviderId;
  contextWindow?: number;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportsVision: boolean;
  supportsEmbedding: boolean;
  description?: string;
}

export interface RegisteredModel {
  id: string;
  displayName: string;
  provider: AiProviderId;
  modalities: ("text" | "vision" | "embedding")[];
  rpmLimit: number;
  tpmLimit: number;
  rpdLimit: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  isCustom?: boolean;
  isActive: boolean;
}

export interface WorkloadRoutingRule {
  feature: string;
  primaryModelId: string;
  fallbackModelId?: string | null;
  enableFailover: boolean;
  notes?: string;
}

export interface AiSystemConfig {
  providers: Record<AiProviderId, StoredProviderConfig>;
  models: RegisteredModel[];
  workloadRouting: Record<string, WorkloadRoutingRule>;
  globalFailoverEnabled: boolean;
  localAiOnlyMode: boolean;
  updatedAt: string;
}

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
}

export interface ProviderTestResult {
  ok: boolean;
  status: number;
  latencyMs: number;
  modelUsed: string;
  message: string;
  error?: string;
}

export interface AiGenerateRequest {
  modelId: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface AiGenerateResponse {
  text: string;
  model: string;
  provider: AiProviderId;
  latencyMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  finishReason?: string | null;
}

export interface AiProviderAdapter {
  readonly providerId: AiProviderId;
  testConnection(credentials: ProviderCredentials, modelId?: string): Promise<ProviderTestResult>;
  discoverModels(credentials: ProviderCredentials): Promise<DiscoveredModel[]>;
  generate(req: AiGenerateRequest, credentials: ProviderCredentials): Promise<AiGenerateResponse>;
}
