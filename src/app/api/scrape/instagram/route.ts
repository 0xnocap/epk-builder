import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy-fetch";

const PARSE_BOT_BASE = "https://api.parse.bot/scraper/e7348582-3fe0-40f5-abb5-58306ec6c982";

const IG_APP_ID = "936619743392459";
const IG_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

// Simple in-memory cache to avoid hammering APIs
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function parseFollowerString(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, "").trim();
  if (cleaned.toLowerCase().endsWith("m")) return Math.round(parseFloat(cleaned) * 1_000_000);
  if (cleaned.toLowerCase().endsWith("k")) return Math.round(parseFloat(cleaned) * 1_000);
  const num = parseInt(cleaned);
  return isNaN(num) ? null : num;
}

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

  const parseApiKey = process.env.PARSE_API_KEY;

  // Strategy 1: parse.bot API (most reliable)
  if (parseApiKey) {
    try {
      // Fire profile videos + link in bio in parallel
      const headers = { "X-API-Key": parseApiKey };
      const [videosRes, bioLinkRes] = await Promise.all([
        fetch(`${PARSE_BOT_BASE}/get_profile_videos?username=${encodeURIComponent(cleanUsername)}`, { headers }),
        fetch(`${PARSE_BOT_BASE}/get_link_in_bio?username=${encodeURIComponent(cleanUsername)}`, { headers }),
      ]);

      let profile: any = null;
      let videos: any[] = [];
      let bioLinkData: any = null;

      if (videosRes.ok) {
        const data = await videosRes.json();
        profile = data.profile || null;
        videos = data.videos || [];
      }

      if (bioLinkRes.ok) {
        bioLinkData = await bioLinkRes.json();
      }

      // If we got profile data from parse.bot, build the result
      if (profile) {
        const followerCount = typeof profile.followers === "number"
          ? profile.followers
          : parseFollowerString(String(profile.followers || profile.followers_count || ""));

        // Extract bio link URL
        let externalUrl: string | null = bioLinkData?.bio_link_url || null;

        // Build social links from bio link data
        const bioLinks = bioLinkData?.links || [];
        const bioSocialLinks = bioLinkData?.social_links || [];

        // Video thumbnails as images, plus any image links from bio
        const videoThumbnails = videos
          .map((v: any) => v.thumbnail_url)
          .filter(Boolean)
          .map(proxyUrl);

        // Video data for the EPK
        const videoData = videos.map((v: any) => ({
          url: v.url || v.post_url,
          videoUrl: v.video_url,
          thumbnailUrl: v.thumbnail_url ? proxyUrl(v.thumbnail_url) : null,
          caption: v.caption,
          likes: v.likes,
          comments: v.comments,
          views: v.video_view_count,
          date: v.date,
          musicInfo: v.music_info || null,
        }));

        const result = {
          username: profile.username || cleanUsername,
          fullName: profile.full_name || null,
          bio: profile.biography || null,
          profilePicUrl: null as string | null, // parse.bot doesn't return profile pic
          externalUrl,
          followerCount,
          followingCount: profile.following || null,
          postCount: typeof profile.total_posts === "number" ? profile.total_posts : parseInt(profile.posts_count) || null,
          recentPostImages: videoThumbnails,
          videos: videoData,
          bioLinks,
          bioSocialLinks,
          isVerified: false,
          isPrivate: false,
          available: true,
          images: videoThumbnails,
        };

        cache.set(cleanUsername, { data: result, timestamp: Date.now() });
        return Response.json(result);
      }

      console.log(`parse.bot returned no profile for ${cleanUsername}, trying ScraperAPI fallback`);
    } catch (err) {
      console.log(`parse.bot failed for ${cleanUsername}, trying ScraperAPI fallback:`, err);
    }
  }

  // Strategy 2: Instagram's undocumented web profile API via ScraperAPI proxy
  try {
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

    if (res.ok) {
      const json = await res.json();
      const user = json?.data?.user;

      if (user) {
        const postEdges = user.edge_owner_to_timeline_media?.edges || [];
        const recentPostImages = postEdges
          .map((edge: any) => edge.node?.display_url)
          .filter(Boolean)
          .slice(0, 12);

        const externalUrl = user.external_url || user.bio_links?.[0]?.url || null;
        const profilePic = user.profile_pic_url_hd || user.profile_pic_url || null;
        const proxiedPostImages = recentPostImages.map(proxyUrl);
        const proxiedProfilePic = profilePic ? proxyUrl(profilePic) : null;

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

    console.log(`Instagram API returned ${res.status} for ${cleanUsername}, trying HTML fallback`);
  } catch (err) {
    console.log(`Instagram API failed for ${cleanUsername}, trying HTML fallback:`, err);
  }

  // Strategy 3: Scrape the public profile page HTML with JS rendering
  try {
    const pageRes = await proxyFetch(
      `https://www.instagram.com/${encodeURIComponent(cleanUsername)}/`,
      {
        render: true,
        headers: {
          "User-Agent": IG_USER_AGENT,
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );

    if (!pageRes.ok) {
      return Response.json({
        username: cleanUsername,
        available: false,
        message: `Instagram returned ${pageRes.status}. Try connecting your account instead.`,
      });
    }

    const html = await pageRes.text();

    const fullName = html.match(/<meta property="og:title" content="([^"]*?)[\s]*\(@/)?.[1]?.trim() || null;
    const bioMeta = html.match(/<meta property="og:description" content="([^"]*?)"/)?.[1] || "";

    let followerCount: number | null = null;
    const followerMatch = bioMeta.match(/([\d,.]+[MKk]?)\s*Followers/i);
    if (followerMatch) followerCount = parseFollowerString(followerMatch[1]);

    let followingCount: number | null = null;
    const followingMatch = bioMeta.match(/([\d,.]+[MKk]?)\s*Following/i);
    if (followingMatch) followingCount = parseFollowerString(followingMatch[1]);

    let postCount: number | null = null;
    const postMatch = bioMeta.match(/([\d,.]+[MKk]?)\s*Posts/i);
    if (postMatch) postCount = parseInt(postMatch[1].replace(/,/g, ""));

    const bioText = bioMeta.replace(/^[\d,.]+[MKk]?\s*Followers,\s*[\d,.]+[MKk]?\s*Following,\s*[\d,.]+[MKk]?\s*Posts\s*-\s*/, "").trim() || null;

    const profilePic = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] || null;
    const proxiedProfilePic = profilePic ? proxyUrl(profilePic) : null;

    let externalUrl: string | null = null;
    const linkMatch = html.match(/"external_url"\s*:\s*"(https?:[^"]+)"/);
    if (linkMatch) {
      externalUrl = linkMatch[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
    }

    const imgMatches = [...html.matchAll(/src="(https:\/\/[^"]*?cdninstagram[^"]*?)"/g)];
    const postImages = imgMatches
      .map((m) => m[1])
      .filter((url) => !url.includes("profile_pic") && !url.includes("150x150"))
      .slice(0, 12)
      .map(proxyUrl);

    if (!fullName && !followerCount && !profilePic) {
      return Response.json({
        username: cleanUsername,
        available: false,
        message: "Could not extract profile data. Profile may be private or not found.",
      });
    }

    const result = {
      username: cleanUsername,
      fullName,
      bio: bioText,
      profilePicUrl: proxiedProfilePic,
      externalUrl,
      followerCount,
      followingCount,
      postCount,
      recentPostImages: postImages,
      videos: [],
      bioLinks: [],
      bioSocialLinks: [],
      isVerified: false,
      isPrivate: false,
      available: true,
      images: [
        ...(proxiedProfilePic ? [proxiedProfilePic] : []),
        ...postImages,
      ],
    };

    cache.set(cleanUsername, { data: result, timestamp: Date.now() });
    return Response.json(result);
  } catch (err) {
    console.error("All Instagram strategies failed:", err);
    return Response.json({
      username: cleanUsername,
      available: false,
      message: "Instagram scrape failed. Try connecting your account instead.",
    });
  }
}
