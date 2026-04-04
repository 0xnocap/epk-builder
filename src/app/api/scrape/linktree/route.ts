import { NextRequest } from "next/server";
import { extractLinktreeLinks } from "@/lib/scrape-utils";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return Response.json({ error: "url parameter required" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      return Response.json({ links: [], title: "", description: "" });
    }

    const html = await res.text();
    const result = extractLinktreeLinks(html);
    return Response.json(result);
  } catch {
    return Response.json({ links: [], title: "", description: "" });
  }
}
