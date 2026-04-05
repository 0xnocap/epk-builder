import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy-fetch";

const TT_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30;

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) {
    return Response.json({ error: "username parameter required" }, { status: 400 });
  }

  const clean = username.replace(/^@/, "").trim().toLowerCase();

  const cached = cache.get(clean);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Response.json(cached.data);
  }

  try {
    const res = await proxyFetch(`https://www.tiktok.com/@${clean}`, {
      headers: { "User-Agent": TT_USER_AGENT },
    });

    if (!res.ok) {
      return Response.json({ username: clean, available: false });
    }

    const html = await res.text();

    // Extract follower count from JSON in page
    const followerMatch = html.match(/"followerCount":(\d+)/);
    const heartMatch = html.match(/"heartCount":(\d+)/);
    const videoMatch = html.match(/"videoCount":(\d+)/);
    const nickMatch = html.match(/"nickName":"([^"]+)"/);
    const bioMatch = html.match(/"signature":"([^"]+)"/);

    const result = {
      username: clean,
      displayName: nickMatch ? decodeUnicode(nickMatch[1]) : null,
      bio: bioMatch ? decodeUnicode(bioMatch[1]) : null,
      followerCount: followerMatch ? parseInt(followerMatch[1]) : null,
      heartCount: heartMatch ? parseInt(heartMatch[1]) : null,
      videoCount: videoMatch ? parseInt(videoMatch[1]) : null,
      available: true,
    };

    cache.set(clean, { data: result, timestamp: Date.now() });
    return Response.json(result);
  } catch {
    return Response.json({ username: clean, available: false });
  }
}

function decodeUnicode(str: string): string {
  return str.replace(/\\u[\dA-Fa-f]{4}/g, (match) =>
    String.fromCharCode(parseInt(match.replace("\\u", ""), 16))
  );
}
