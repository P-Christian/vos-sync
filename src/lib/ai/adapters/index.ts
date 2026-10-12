// src/lib/ai/adapters/index.ts
import { AiProviderAdapter, AiProviderId } from "../types";
import { GoogleGeminiAdapter } from "./GoogleGeminiAdapter";
import { LocalOllamaAdapter } from "./LocalOllamaAdapter";
import { OpenAiAdapter } from "./OpenAiAdapter";
import { AnthropicAdapter } from "./AnthropicAdapter";

const adapters: Record<AiProviderId, AiProviderAdapter> = {
  google: new GoogleGeminiAdapter(),
  ollama: new LocalOllamaAdapter(),
  openai: new OpenAiAdapter("openai", "https://api.openai.com/v1"),
  mistral: new OpenAiAdapter("mistral", "https://api.mistral.ai/v1"),
  anthropic: new AnthropicAdapter(),
  local_custom: new OpenAiAdapter("local_custom", "http://localhost:1234/v1"),
};

export function getProviderAdapter(providerId: AiProviderId): AiProviderAdapter {
  const adapter = adapters[providerId];
  if (!adapter) {
    throw new Error(`Unsupported AI Provider: ${providerId}`);
  }
  return adapter;
}

export {
  GoogleGeminiAdapter,
  LocalOllamaAdapter,
  OpenAiAdapter,
  AnthropicAdapter,
};
