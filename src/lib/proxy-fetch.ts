/**
 * Proxy fetch through ScraperAPI to avoid cloud IP blocking.
 * Falls back to direct fetch if no API key is configured.
 */
export async function proxyFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const apiKey = process.env.SCRAPER_API_KEY;

  if (apiKey) {
    // Route through ScraperAPI residential proxy
    const proxyUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;
    return fetch(proxyUrl, {
      method: options?.method || "GET",
      headers: {
        // ScraperAPI handles headers, but pass content-type if needed
        ...(options?.headers as Record<string, string> || {}),
      },
    });
  }

  // No proxy key - direct fetch (works locally, may fail in production)
  return fetch(url, options);
}
