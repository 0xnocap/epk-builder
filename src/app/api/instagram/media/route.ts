import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.nextUrl.searchParams.get("token");
  if (!accessToken) {
    return Response.json({ error: "token parameter required" }, { status: 400 });
  }

  try {
    // Fetch user's recent media
    const res = await fetch(
      `https://graph.instagram.com/v22.0/me/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp&limit=25&access_token=${accessToken}`
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("IG media fetch failed:", err);
      return Response.json({ media: [], error: "Failed to fetch media" });
    }

    const data = await res.json();
    const media = (data.data || [])
      .filter((item: any) =>
        item.media_type === "IMAGE" ||
        item.media_type === "CAROUSEL_ALBUM"
      )
      .map((item: any) => ({
        id: item.id,
        type: item.media_type,
        url: item.media_url,
        thumbnail: item.thumbnail_url || item.media_url,
        caption: item.caption || "",
        timestamp: item.timestamp,
      }));

    return Response.json({ media });
  } catch (err) {
    console.error("IG media endpoint error:", err);
    return Response.json({ media: [] });
  }
}
