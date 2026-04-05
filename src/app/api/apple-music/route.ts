import { NextRequest } from "next/server";
import { searchArtist } from "@/lib/apple-music";

export async function GET(request: NextRequest) {
  const artistName = request.nextUrl.searchParams.get("artist");
  if (!artistName) {
    return Response.json({ error: "artist parameter required" }, { status: 400 });
  }

  const data = await searchArtist(artistName);
  if (!data) {
    return Response.json({ error: "Artist not found" }, { status: 404 });
  }

  return Response.json(data);
}
