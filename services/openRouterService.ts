import { OpenRouterResponse, Message } from '../types';
import { API_ENDPOINTS } from '../utils/api';

interface FetchOptions {
  model: string;
  query: string;
  temperature?: number;
}

const SYSTEM_PROMPT = `Research assistant for claim extraction with verified sources.

OUTPUT: Valid JSON only (no markdown/explanations).
SOURCES: Prioritize Tier-1 news, academic journals, .gov/.edu/.org, industry reports.
FALLBACK: Wikipedia is acceptable if primary sources are scarce. Avoid low-quality blogs/forums.
QUALITY: Domain authority, specific details, credentials, peer-review.`;

const buildUserPrompt = (query: string): string => {
  const today = new Date().toISOString().split('T')[0];

  return `Topic: ${query}

OBJECTIVE: Extract claims with verified sources for Executive Summary.

CRITERIA:
- Specific, measurable, relevant
- SOURCES: Prioritize Tier-1 news, academic, .gov/.edu/.org, industry reports.
- FALLBACK: Wikipedia is allowed for general context or if other sources are unavailable.
- DIVERSITY: Max 1-2 claims per domain

CATEGORIES: Empirical, Historical, Theoretical, Application, Trend

JSON STRUCTURE:
{
  "metadata": {"topic_summary": "3-4 sentences (Indonesian)", "total_claims": 0, "extraction_date": "${today}"},
  "claims": [{
    "id": "claim_001",
    "claim": "Statement (Indonesian)",
    "context": "Context (Indonesian)",
    "sources": [{"url": "https://...", "title": "Title", "date": "YYYY-MM", "credibility": "high"}],
    "category": "Empirical|Historical|Theoretical|Application|Trend",
    "keywords": ["kw1", "kw2"]
  }]
}

INSTRUCTIONS:
1. Deep search, prioritize authoritative sources.
2. Use Wikipedia only as a secondary or fallback source.
3. Specific URLs (deep links), cross-validate
3. SOURCE DIVERSITY: Different domains per claim (e.g., techcrunch.com, wired.com, mit.edu - NOT 3x techcrunch.com)
4. LANGUAGE: Indonesian text + English technical terms (e.g., "AI" not "Kecerdasan Buatan", "Market Positioning" not "Pemosisian Pasar")
5. Output raw JSON (no \`\`\`json)

EDGE CASES:
- No sources: Empty claims + explanation in topic_summary
- Conflicts: Multiple perspectives with attribution
- Outdated (>24mo): Add "recency_note"
- Validation needed: 2-3+ corroborating sources

EXAMPLE:
{"metadata": {"topic_summary": "AI dalam healthcare tumbuh signifikan dengan adoption 45% di RS besar 2024. Meningkatkan diagnostic accuracy dan outcomes.", "total_claims": 1, "extraction_date": "${today}"}, "claims": [{"id": "claim_001", "claim": "AI diagnostic tools tingkatkan akurasi 94% vs konvensional", "context": "Stanford Medicine: peningkatan early detection kanker paru via deep learning", "sources": [{"url": "https://med.stanford.edu/news/ai-detection.html", "title": "AI Improves Detection", "date": "2024-03", "credibility": "high"}], "category": "Empirical", "keywords": ["AI", "diagnostic", "healthcare"]}]}`;
};

export const fetchOpenRouterResponse = async ({
  model,
  query,
  temperature = 0.2
}: FetchOptions): Promise<OpenRouterResponse> => {
  // Validation
  if (!model?.trim()) {
    throw new Error("Model is required");
  }

  if (!query?.trim()) {
    throw new Error("Query is required");
  }

  const messages: Message[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    {
      role: "user",
      content: buildUserPrompt(query)
    }
  ];

  const body = {
    model,
    messages,
    temperature,
  };

  try {
    const response = await fetch(API_ENDPOINTS.CHAT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Handle HTTP errors
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errData = await response.json();
        errorMessage = errData?.error?.message || errorMessage;
      } catch {
        // If JSON parsing fails, use default error message
      }

      throw new Error(errorMessage);
    }

    const data: OpenRouterResponse = await response.json();

    // Validate response structure
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error("Invalid response structure from OpenRouter");
    }

    if (!data.choices[0].message?.content) {
      throw new Error("No content in response from OpenRouter");
    }

    return data;

  } catch (error) {
    // Enhanced error handling
    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('fetch')) {
        throw new Error("Network error: Unable to connect to OpenRouter. Please check your internet connection.");
      }

      // API errors
      if (error.message.includes('401')) {
        throw new Error("Autentikasi gagal: API Key tidak valid. Periksa pengaturan Anda.");
      }

      if (error.message.includes('429')) {
        throw new Error("Batas permintaan (rate limit) terlampaui: Silakan tunggu sebentar sebelum mencoba lagi.");
      }

      if (error.message.includes('404')) {
        throw new Error("Model atau Endpoint tidak ditemukan (404). Periksa konfigurasi model.");
      }

      if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
        throw new Error("Layanan OpenRouter sedang bermasalah (Server Error). Silakan coba lagi nanti.");
      }

      // Re-throw with original message if not matched above
      throw error;
    }

    // Unknown error type
    throw new Error("Terjadi kesalahan tak terduga saat mengambil data. Silakan coba lagi.");
  }
};

// Helper function to parse JSON from response content
export const parseClaimsFromResponse = (content: string): any => {
  try {
    if (!content || content.trim().length === 0) {
      throw new Error("AI memberikan respons kosong.");
    }

    // Check for common "not found" indicators in natural language
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes("sorry") || lowerContent.includes("tidak dapat menemukan") || lowerContent.includes("tidak ditemukan")) {
      if (!content.includes('{') || !content.includes('"claims"')) {
        throw new Error("Topik tidak ditemukan atau sumber data tidak mencukupi untuk mengekstrak klaim.");
      }
    }

    // Remove potential markdown formatting
    const cleanedContent = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // Find the first { and last } to extract JSON if there's surrounding text
    const firstBrace = cleanedContent.indexOf('{');
    const lastBrace = cleanedContent.lastIndexOf('}');

    let jsonToParse = cleanedContent;
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonToParse = cleanedContent.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonToParse);

    // Validate parsed structure
    if (!parsed.metadata || !parsed.claims) {
      throw new Error("Format data tidak lengkap: Metadata atau Claims tidak ditemukan.");
    }

    if (!Array.isArray(parsed.claims)) {
      throw new Error("Format data salah: 'claims' harus berupa daftar (array).");
    }

    if (parsed.claims.length === 0) {
      // This is a valid JSON but empty claims - we might want to handle this specifically
      return parsed;
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Gagal mengurai format data (JSON Syntax Error). Barangkali model AI memberikan format yang tidak valid.`);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Gagal memproses data dari AI.");
  }
};