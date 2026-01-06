import { OpenRouterResponse, Message } from '../types';
import { API_ENDPOINTS } from '../utils/api';

interface FetchOptions {
  model: string;
  query: string;
  temperature?: number;
}

const SYSTEM_PROMPT = `Your task is to extract key phrases, main concepts, significant entities, and atomic factual claims from search results
related to the provided book or topic.

==============================
EXTRACTION DOCTRINE & HARD CONSTRAINTS
==============================

1. GROUNDED (NON-NEGOTIABLE)
- Every claim MUST originate explicitly from the provided search results.
- DO NOT infer, extrapolate, synthesize, or generalize beyond the source text.
- If a statement is not explicitly supported, DO NOT output it.

2. SOURCE QUALITY
- Prioritize Tier-1 sources: academic journals, university presses, reputable publishers,
  .gov / .edu / .org domains, and established industry or research institutions.
- Wikipedia is permitted ONLY as a fallback for high-level background when primary sources are unavailable.
- Avoid blogs, forums, opinion pieces, or unverifiable aggregators.

3. SOURCE DEFINITION (CRITICAL)
- A "source" is defined by its PRIMARY DOMAIN (e.g., nytimes.com),
  NOT by individual URLs or pages.
- Multiple URLs from the same domain COUNT AS ONE SOURCE.

4. DIVERSITY (HARD CONSTRAINT)
- For EACH claim: all listed sources MUST come from DISTINCT DOMAINS.
- Across the entire extraction:
  - Maximum ONE claim per unique domain.
  - Additional claims from the same domain are ONLY allowed if
    corroborated by at least one independent domain.

5. FAILURE MODE
- If domain diversity cannot be satisfied:
  - Output FEWER claims.
  - DO NOT repeat or pad claims using the same domain.
  - Prefer omission over violation.

6. ATOMICITY
- One claim = one single, precise, factual statement.
- No compound, multi-part, or interpretive claims.

7. CONTEXT BOUNDARY
- The "context" field may ONLY provide brief descriptive background
  that clarifies the claim.
- Context MUST NOT introduce new facts or interpretations.

8. CONFIDENCE SCORE
- confidence_score (0.0–1.0) represents evidence strength,
  based on source authority, specificity, and clarity.
- It is NOT a probability of truth.

9. VERIFICATION FLAG
- is_unverified = true IF:
  - source_count < 2 for a non-trivial claim, OR
  - sources are medium/low credibility, OR
  - corroboration is weak or indirect.

==============================
LANGUAGE & STYLE
==============================
- Use clear, professional Indonesian for all content fields (claims, context, topic_summary).
- Use accurate and widely accepted technical terminology in English (e.g., "AI", "blockchain", "deep learning").
- No speculative or narrative language.

==============================
CONFLICTING SOURCES
==============================
- If authoritative sources present conflicting factual claims,
  represent EACH position as a separate atomic claim.
- Each claim MUST have its own sources from distinct domains.
- Clearly attribute the position to its source.
- Do NOT resolve or synthesize the conflict.

CRITICAL: Output ONLY valid JSON. No prose, no markdown.`;

const buildUserPrompt = (query: string): string => {
  const today = new Date().toISOString().split('T')[0];

  return `Topic: ${query}

OBJECTIVE: Extract claims with verified sources for Executive Summary.

CRITERIA:
- Specific, measurable, relevant
- SOURCES: Prioritize Tier-1 news, academic, .gov/.edu/.org, industry reports.
- FALLBACK: Wikipedia is allowed for general context or if other sources are unavailable.
- DIVERSITY: Max 1-2 claims per domain (strict enforcement)

CATEGORIES: Empirical, Historical, Theoretical, Application, Trend

JSON STRUCTURE (STRICT — NO EXTRA FIELDS):
{
  "metadata": {
    "topic_summary": "2–3 sentence neutral summary in Indonesian",
    "total_claims": 0,
    "extraction_date": "${today}"
  },
  "key_phrases": ["phrase1", "phrase2"],
  "main_concepts": ["concept1"],
  "significant_entities": [
    { "name": "Entity Name", "type": "Person|Organization|Book|Concept|Event" }
  ],
  "claims": [
    {
      "id": "claim_001",
      "claim": "Single factual statement in Indonesian",
      "context": "Brief descriptive context in Indonesian",
      "sources": [
        {
          "title": "Source Title",
          "url": "https://...",
          "publisher": "Publisher Name",
          "source_type": "Book|Journal|Web|Report",
          "date": "YYYY-MM-DD",
          "credibility": "high|medium|low"
        }
      ],
      "confidence_score": 0.95,
      "claim_type": "fact",
      "category": "Empirical|Historical|Theoretical|Application|Trend",
      "keywords": ["kw1", "kw2"],
      "recency_note": "",
      "source_count": 1,
      "is_unverified": false
    }
  ],
  "extraction_version": "2.1.0",
  "prompt_hash": "v2_ind_strict_domain_diversity"
}

INSTRUCTIONS:
1. Deep search, prioritize authoritative sources.
2. Use Wikipedia only as a secondary or fallback source.
3. Specific URLs (deep links), cross-validate
4. SOURCE DIVERSITY: Different domains per claim (e.g., techcrunch.com, wired.com, mit.edu - NOT 3x techcrunch.com)
5. LANGUAGE: Indonesian text for claims/context/summary + English technical terms (e.g., "AI" not "Kecerdasan Buatan", "Market Positioning" not "Pemosisian Pasar")
6. Output raw JSON (no \`\`\`json)

EDGE CASES:
- No sources: Empty claims + explanation in topic_summary
- Conflicts: Multiple perspectives with attribution (separate claims)
- Outdated (>24mo): Add "recency_note"
- Validation needed: 2-3+ corroborating sources

EXAMPLE:
{"metadata": {"topic_summary": "AI dalam healthcare tumbuh signifikan dengan adoption 45% di RS besar 2024. Meningkatkan diagnostic accuracy dan outcomes.", "total_claims": 1, "extraction_date": "${today}"}, "key_phrases": ["AI healthcare", "diagnostic accuracy"], "main_concepts": ["AI adoption in healthcare"], "significant_entities": [{"name": "Stanford Medicine", "type": "Organization"}], "claims": [{"id": "claim_001", "claim": "AI diagnostic tools tingkatkan akurasi 94% vs konvensional", "context": "Stanford Medicine: peningkatan early detection kanker paru via deep learning", "sources": [{"url": "https://med.stanford.edu/news/ai-detection.html", "title": "AI Improves Detection", "publisher": "Stanford Medicine", "source_type": "Web", "date": "2024-03", "credibility": "high"}], "confidence_score": 0.95, "claim_type": "fact", "category": "Empirical", "keywords": ["AI", "diagnostic", "healthcare"], "recency_note": "", "source_count": 1, "is_unverified": false}], "extraction_version": "2.1.0", "prompt_hash": "v2_ind_strict_domain_diversity"}`;
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