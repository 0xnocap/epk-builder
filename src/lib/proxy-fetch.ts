/**
 * Proxy fetch through ScraperAPI to avoid cloud IP blocking.
 * Falls back to direct fetch if no API key is configured.
 */
export async function proxyFetch(
  url: string,
  options?: RequestInit & { render?: boolean; keepHeaders?: boolean }
): Promise<Response> {
  const apiKey = process.env.SCRAPER_API_KEY;

  if (apiKey) {
    const renderParam = options?.render ? "&render=true" : "";
    const keepHeaders = options?.keepHeaders || options?.headers ? "&keep_headers=true" : "";
    const proxyUrl = `http://api.scraperapi.com?api_key=${apiKey}${renderParam}${keepHeaders}&url=${encodeURIComponent(url)}`;
    return fetch(proxyUrl, {
      method: options?.method || "GET",
      headers: {
        ...(options?.headers as Record<string, string> || {}),
      },
    });
  }

  // No proxy key - direct fetch (works locally, may fail in production)
  return fetch(url, options);
}
