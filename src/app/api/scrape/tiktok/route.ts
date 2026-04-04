import { NextRequest } from "next/server";

/**
 * TikTok profile scraper - pluggable backend.
 * Currently returns a stub response.
 * Swap in parse.bot, DIY scraping, or RapidAPI when ready.
 */
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) {
    return Response.json({ error: "username parameter required" }, { status: 400 });
  }

  // TODO: Layer 1 - parse.bot scraper
  // TODO: Layer 2 - DIY scrape attempt
  // TODO: Layer 3 - RapidAPI fallback

  return Response.json({
    username,
    displayName: null,
    bio: null,
    profilePicUrl: null,
    externalUrl: null,
    followerCount: null,
    recentVideoThumbnails: [],
    isVerified: false,
    available: false,
    message: "TikTok scraper not yet configured. Connect your account to import data.",
  });
}
