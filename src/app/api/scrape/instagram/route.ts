import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy-fetch";

const IG_APP_ID = "936619743392459";
const IG_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

// Simple in-memory cache to avoid hammering Instagram
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) {
    return Response.json({ error: "username parameter required" }, { status: 400 });
  }

  const cleanUsername = username.replace(/^@/, "").trim().toLowerCase();

  // Check cache
  const cached = cache.get(cleanUsername);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Response.json(cached.data);
  }

  try {
    // Instagram's undocumented web profile API - routed through proxy in production
    const res = await proxyFetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(cleanUsername)}`,
      {
        headers: {
          "User-Agent": IG_USER_AGENT,
          "X-IG-App-ID": IG_APP_ID,
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.instagram.com/",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    if (!res.ok) {
      return Response.json({
        username: cleanUsername,
        available: false,
        message: `Instagram returned ${res.status}. Try connecting your account instead.`,
      });
    }

    const json = await res.json();
    const user = json?.data?.user;

    if (!user) {
      return Response.json({
        username: cleanUsername,
        available: false,
        message: "Profile not found.",
      });
    }

    // Extract recent post images
    const postEdges = user.edge_owner_to_timeline_media?.edges || [];
    const recentPostImages = postEdges
      .map((edge: any) => edge.node?.display_url)
      .filter(Boolean)
      .slice(0, 12);

    // Extract bio link
    const externalUrl = user.external_url || user.bio_links?.[0]?.url || null;

    // Proxy IG CDN images through our server to avoid hotlink blocking
    const origin = request.nextUrl.origin;
    const proxyUrl = (url: string) =>
      `${origin}/api/proxy-image?url=${encodeURIComponent(url)}`;

    const profilePic = user.profile_pic_url_hd || user.profile_pic_url || null;
    const proxiedPostImages = recentPostImages.map(proxyUrl);
    const proxiedProfilePic = profilePic ? proxyUrl(profilePic) : null;

    // Build response
    const result = {
      username: user.username || cleanUsername,
      fullName: user.full_name || null,
      bio: user.biography || null,
      profilePicUrl: proxiedProfilePic,
      externalUrl,
      followerCount: user.edge_followed_by?.count || null,
      followingCount: user.edge_follow?.count || null,
      postCount: user.edge_owner_to_timeline_media?.count || null,
      recentPostImages: proxiedPostImages,
      isVerified: user.is_verified || false,
      isPrivate: user.is_private || false,
      available: true,
      images: [
        ...(proxiedProfilePic ? [proxiedProfilePic] : []),
        ...proxiedPostImages,
      ],
    };

    // Cache result
    cache.set(cleanUsername, { data: result, timestamp: Date.now() });

    return Response.json(result);
  } catch (err) {
    console.error("Instagram scrape failed:", err);
    return Response.json({
      username: cleanUsername,
      available: false,
      message: "Instagram scrape failed. Try connecting your account instead.",
    });
  }
}
