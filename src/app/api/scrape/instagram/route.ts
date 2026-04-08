import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy-fetch";

const SUPABASE_EDGE_URL = "https://dctnhvgmsckrgbfokarg.supabase.co/functions/v1/epk-instagram";
const PARSE_BOT_BASE = "https://api.parse.bot/scraper/e7348582-3fe0-40f5-abb5-58306ec6c982";

const IG_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

// Simple in-memory cache to avoid hammering APIs
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

  const origin = request.nextUrl.origin;
  const proxyUrl = (url: string) =>
    `${origin}/api/proxy-image?url=${encodeURIComponent(url)}`;

  // Strategy 1: Supabase edge function (different IP pool, not blocked by IG)
  try {
    const res = await fetch(
      `${SUPABASE_EDGE_URL}?username=${encodeURIComponent(cleanUsername)}`
    );

    if (res.ok) {
      const data = await res.json();
      if (data.available) {
        // Proxy IG CDN images through our server to avoid hotlink blocking
        const proxiedProfilePic = data.profilePicUrl ? proxyUrl(data.profilePicUrl) : null;
        const proxiedPostImages = (data.recentPostImages || []).map(proxyUrl);

        const result = {
          username: data.username || cleanUsername,
          fullName: data.fullName || null,
          bio: data.bio || null,
          profilePicUrl: proxiedProfilePic,
          externalUrl: data.externalUrl || null,
          followerCount: data.followerCount || null,
          followingCount: data.followingCount || null,
          postCount: data.postCount || null,
          recentPostImages: proxiedPostImages,
          videos: [],
          bioLinks: [],
          bioSocialLinks: [],
          isVerified: data.isVerified || false,
          isPrivate: data.isPrivate || false,
          available: true,
          images: [
            ...(proxiedProfilePic ? [proxiedProfilePic] : []),
            ...proxiedPostImages,
          ],
        };

        cache.set(cleanUsername, { data: result, timestamp: Date.now() });
        return Response.json(result);
      }
    }

    console.log(`Supabase edge returned ${res.status} for ${cleanUsername}, trying parse.bot`);
  } catch (err) {
    console.log(`Supabase edge failed for ${cleanUsername}:`, err);
  }

  // Strategy 2: parse.bot API (when their scraper is working)
  const parseApiKey = process.env.PARSE_API_KEY;
  if (parseApiKey) {
    try {
      const headers = { "X-API-Key": parseApiKey };
      const profileRes = await fetch(
        `${PARSE_BOT_BASE}/get_profile?username=${encodeURIComponent(cleanUsername)}`,
        { headers }
      );

      if (profileRes.ok) {
        const raw = await profileRes.json();
        const profile = raw?.data || raw;

        if (profile?.followers_count || profile?.biography) {
          const proxiedProfilePic = profile.profile_pic_url ? proxyUrl(profile.profile_pic_url) : null;

          const result = {
            username: profile.username || cleanUsername,
            fullName: profile.full_name || null,
            bio: profile.biography || null,
            profilePicUrl: proxiedProfilePic,
            externalUrl: profile.external_url || null,
            followerCount: typeof profile.followers_count === "number"
              ? profile.followers_count
              : null,
            followingCount: typeof profile.following_count === "number"
              ? profile.following_count
              : null,
            postCount: typeof profile.posts_count === "number"
              ? profile.posts_count
              : null,
            recentPostImages: [],
            videos: [],
            bioLinks: [],
            bioSocialLinks: [],
            isVerified: profile.is_verified || false,
            isPrivate: profile.is_private || false,
            available: true,
            images: proxiedProfilePic ? [proxiedProfilePic] : [],
          };

          cache.set(cleanUsername, { data: result, timestamp: Date.now() });
          return Response.json(result);
        }
      }

      console.log(`parse.bot had no usable data for ${cleanUsername}, trying ScraperAPI`);
    } catch (err) {
      console.log(`parse.bot failed for ${cleanUsername}:`, err);
    }
  }

  // Strategy 3: ScraperAPI proxy (often blocked by IG)
  try {
    const res = await proxyFetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(cleanUsername)}`,
      {
        headers: {
          "User-Agent": IG_USER_AGENT,
          "X-IG-App-ID": "936619743392459",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.instagram.com/",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    if (res.ok) {
      const json = await res.json();
      const user = json?.data?.user;

      if (user) {
        const postEdges = user.edge_owner_to_timeline_media?.edges || [];
        const recentPostImages = postEdges
          .map((edge: any) => edge.node?.display_url)
          .filter(Boolean)
          .slice(0, 12);

        const profilePic = user.profile_pic_url_hd || user.profile_pic_url || null;
        const proxiedPostImages = recentPostImages.map(proxyUrl);
        const proxiedProfilePic = profilePic ? proxyUrl(profilePic) : null;

        const result = {
          username: user.username || cleanUsername,
          fullName: user.full_name || null,
          bio: user.biography || null,
          profilePicUrl: proxiedProfilePic,
          externalUrl: user.external_url || user.bio_links?.[0]?.url || null,
          followerCount: user.edge_followed_by?.count || null,
          followingCount: user.edge_follow?.count || null,
          postCount: user.edge_owner_to_timeline_media?.count || null,
          recentPostImages: proxiedPostImages,
          videos: [],
          bioLinks: [],
          bioSocialLinks: [],
          isVerified: user.is_verified || false,
          isPrivate: user.is_private || false,
          available: true,
          images: [
            ...(proxiedProfilePic ? [proxiedProfilePic] : []),
            ...proxiedPostImages,
          ],
        };

        cache.set(cleanUsername, { data: result, timestamp: Date.now() });
        return Response.json(result);
      }
    }
  } catch {
    // Fall through to failure
  }

  return Response.json({
    username: cleanUsername,
    available: false,
    message: "All Instagram strategies failed. Try connecting your account instead.",
  });
}
