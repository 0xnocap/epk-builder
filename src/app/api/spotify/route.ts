import { NextRequest, NextResponse } from "next/server";

async function getSpotifyToken(): Promise<string> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error("Spotify token error:", data);
    throw new Error("Failed to get Spotify token");
  }
  return data.access_token;
}

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get("artistId");
  if (!artistId) {
    return NextResponse.json({ error: "artistId required" }, { status: 400 });
  }

  try {
    const token = await getSpotifyToken();
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch artist data
    const artistRes = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      { headers }
    );

    if (!artistRes.ok) {
      const err = await artistRes.text();
      console.error("Spotify artist error:", artistRes.status, err);
      return NextResponse.json({ error: "Failed to fetch artist" }, { status: artistRes.status });
    }

    const artist = await artistRes.json();

    // Try top tracks (may 403 in dev mode)
    let topTracks: any[] = [];
    try {
      const topTracksRes = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        { headers }
      );
      if (topTracksRes.ok) {
        const topTracksData = await topTracksRes.json();
        topTracks = (topTracksData.tracks || []).slice(0, 5).map((t: any) => ({
          name: t.name,
          album: t.album?.name,
          albumArt: t.album?.images?.[0]?.url,
          previewUrl: t.preview_url,
          spotifyUrl: t.external_urls?.spotify,
        }));
      }
    } catch {
      // Top tracks unavailable, continue without them
    }

    // Scrape monthly listeners from Spotify's public page (not in API)
    let monthlyListeners: number | null = null;
    try {
      const pageRes = await fetch(`https://open.spotify.com/artist/${artistId}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      });
      if (pageRes.ok) {
        const pageHtml = await pageRes.text();
        const mlMatch = pageHtml.match(/content="[^"]*?([\d,.]+[MKB]?) monthly listeners/i);
        if (mlMatch) {
          const raw = mlMatch[1].replace(/,/g, "");
          if (raw.endsWith("M")) monthlyListeners = Math.round(parseFloat(raw) * 1_000_000);
          else if (raw.endsWith("K")) monthlyListeners = Math.round(parseFloat(raw) * 1_000);
          else if (raw.endsWith("B")) monthlyListeners = Math.round(parseFloat(raw) * 1_000_000_000);
          else monthlyListeners = parseInt(raw);
        }
      }
    } catch {
      // Monthly listeners scrape failed, continue without
    }

    return NextResponse.json({
      name: artist.name,
      genres: artist.genres || [],
      images: artist.images || [],
      popularity: artist.popularity || null,
      followers: artist.followers?.total || null,
      monthlyListeners,
      spotifyUrl: artist.external_urls?.spotify,
      topTracks,
    });
  } catch (error) {
    console.error("Spotify API error:", error);
    return NextResponse.json({ error: "Failed to fetch artist data" }, { status: 500 });
  }
}
