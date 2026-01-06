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