export interface Citation {
  index: number;
  url: string;
  domain: string;
}

export interface ExtractedData {
  content: string;
  citations: Citation[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: {
    message: Message;
    finish_reason: string;
    // Perplexity/Sonar specific field often passed through OpenRouter
    citations?: string[];
  }[];
  // Sometimes citations are at the root level in non-standard implementations
  citations?: string[];
}

export interface AppState {
  apiKey: string;
  query: string;
  model: string;
  isLoading: boolean;
  error: string | null;
  result: ExtractedData | null;
}

export interface ClaimRow {
  id: string;
  claim: string;
  category: string;
  context: string;
  sources: { url: string; domain: string; title?: string }[];
}

export const AVAILABLE_MODELS = [
  { id: 'perplexity/sonar', name: 'Sonar' },
  { id: 'perplexity/sonar-pro', name: 'Sonar Pro' },
  { id: 'perplexity/sonar-pro-search', name: 'Sonar Pro Search' },
  { id: 'perplexity/sonar-reasoning', name: 'Sonar Reasoning' },
  { id: 'perplexity/sonar-reasoning-pro', name: 'Sonar Reasoning Pro' },
  { id: 'perplexity/sonar-deep-research', name: 'Sonar Deep Research' },
];