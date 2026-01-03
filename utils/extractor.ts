import { Citation, ExtractedData, OpenRouterResponse } from '../types';

/**
 * Cleans up URLs, specifically removing Google Translate wrappers to reveal the original source.
 * Example: https://translate.google.com/translate?u=https://example.com... -> https://example.com
 */
export const cleanUrl = (url: string): string => {
  if (!url) return '';
  try {
    // Check for Google Translate links
    if (url.includes('translate.google.com') || url.includes('translate.googleusercontent.com')) {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      // 'u' is commonly used by translate.google.com, 'url' is sometimes used
      const realUrl = params.get('u') || params.get('url');
      if (realUrl) return realUrl;
    }
    return url;
  } catch (e) {
    return url;
  }
};

/**
 * Extracts the domain name from a URL for display purposes.
 */
export const getDomain = (url: string): string => {
  try {
    const clean = cleanUrl(url); // Ensure we work with the real URL
    const hostname = new URL(clean).hostname;
    return hostname.replace('www.', '');
  } catch (e) {
    return 'Unknown Source';
  }
};

/**
 * Main logic to handle the messy reality of AI proxy responses.
 * 
 * Priority of extraction:
 * 1. `choices[0].citations` (Native Perplexity format)
 * 2. `citations` (Root level extension)
 * 3. Regex extraction from text (Fallback)
 */
export const processResponse = (data: any, originalContent: string): ExtractedData => {
  let foundUrls: string[] = [];

  // 1. Try to find structured citations in the JSON response
  if (data?.choices?.[0]?.citations && Array.isArray(data.choices[0].citations)) {
    foundUrls = data.choices[0].citations;
  } else if (data?.citations && Array.isArray(data.citations)) {
    foundUrls = data.citations;
  }

  // 2. Fallback: If no structured citations, extract standard URLs from text
  // This helps when the proxy strips metadata but leaves the text intact
  // Updated regex to stop at quotes " to support JSON strings better
  if (foundUrls.length === 0) {
    const urlRegex = /(https?:\/\/[^\s\]\)"']+)/g;
    const matches = originalContent.match(urlRegex);
    if (matches) {
      // Deduplicate
      foundUrls = Array.from(new Set(matches));
      
      // Basic cleanup (remove trailing punctuation often caught by regex)
      foundUrls = foundUrls.map(url => url.replace(/[.,;)]$/, ''));
    }
  }

  // 3. Normalize to Citation objects
  const citations: Citation[] = foundUrls.map((url, index) => {
    const cleaned = cleanUrl(url);
    return {
      index: index + 1,
      url: cleaned,
      domain: getDomain(cleaned)
    };
  });

  // 4. Process content to highlight citation markers if they exist
  // Perplexity often uses [1], [2]. We try to ensure they exist in the text.
  // If the text has no markers but we have URLs, we append a source list.
  let content = originalContent;

  return {
    content,
    citations
  };
};