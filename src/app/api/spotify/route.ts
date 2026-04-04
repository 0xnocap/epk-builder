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
  return data.access_token;
}

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get("artistId");
  if (!artistId) {
    return NextResponse.json({ error: "artistId required" }, { status: 400 });
  }

  try {
    const token = await getSpotifyToken();

    const [artistRes, topTracksRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const artist = await artistRes.json();
    const topTracks = await topTracksRes.json();

    return NextResponse.json({
      name: artist.name,
      genres: artist.genres || [],
      images: artist.images || [],
      popularity: artist.popularity,
      followers: artist.followers?.total,
      spotifyUrl: artist.external_urls?.spotify,
      topTracks: (topTracks.tracks || []).slice(0, 5).map((t: { name: string; album: { name: string; images: { url: string }[] }; preview_url: string | null; external_urls: { spotify: string } }) => ({
        name: t.name,
        album: t.album.name,
        albumArt: t.album.images?.[0]?.url,
        previewUrl: t.preview_url,
        spotifyUrl: t.external_urls?.spotify,
      })),
    });
  } catch (error) {
    console.error("Spotify API error:", error);
    return NextResponse.json({ error: "Failed to fetch artist data" }, { status: 500 });
  }
}
