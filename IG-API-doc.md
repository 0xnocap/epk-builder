# instagram.com API

Download video and reel posts from Instagram profiles along with captions, audio tracks, likes, and comments to analyze content performance or build video collections. Search through specific profiles to access post details and engagement metrics for research or content curation purposes.

Base URL: `https://api.parse.bot/scraper/e7348582-3fe0-40f5-abb5-58306ec6c982`

---

## GET `get_profile_videos`

Get video/reel posts from an Instagram profile. Returns profile metadata and all video posts found in the most recent posts (up to 12 posts scanned). Each video includes a direct video URL, caption, music info, view counts, and engagement data.

```
GET https://api.parse.bot/scraper/e7348582-3fe0-40f5-abb5-58306ec6c982/get_profile_videos
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `username` | string | No | Instagram username to fetch videos from |

| Name | Location | Description |
|------|----------|-------------|
| `X-API-Key` | header | Your API key (required) |

### Response

```json
{
  "videos": [
    {
      "url": "https://www.instagram.com/reel/DWHADHOCHqU/",
      "date": "2026-03-20 14:20:00 UTC",
      "likes": 165,
      "caption": "I had no idea what it meant to lead my projects…",
      "comments": 2,
      "post_url": "https://www.instagram.com/p/DWHADHOCHqU/",
      "has_audio": true,
      "shortcode": "DWHADHOCHqU",
      "timestamp": 1774016400,
      "video_url": "https://scontent-ams2-1.cdninstagram.com/...mp4...",
      "music_info": {
        "song": "Enemy Of Truth",
        "artist": "Jung Se Rin",
        "audio_id": "551482886203744",
        "uses_original_audio": false
      },
      "product_type": "clips",
      "thumbnail_url": "https://scontent-ams2-1.cdninstagram.com/...",
      "video_view_count": 2426,
      "accessibility_caption": null
    }
  ],
  "profile": {
    "username": "ux_ari",
    "biography": "🕊️product design & productivity...",
    "followers": 68334,
    "following": 102,
    "full_name": "Ari • Product Designer",
    "has_clips": true,
    "total_posts": 602
  },
  "posts_scanned": 12,
  "total_videos_found": 2
}
```

---

## GET `get_post_details`

Get basic information about a specific Instagram post/reel by its shortcode. Extracts caption, thumbnail, likes, and comments from the page meta tags. Note: video download URLs are only available through the get_profile_videos endpoint.

```
GET https://api.parse.bot/scraper/e7348582-3fe0-40f5-abb5-58306ec6c982/get_post_details
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `shortcode` | string | Yes | Instagram post/reel shortcode (e.g., 'DWHADHOCHqU' from the URL instagram.com/reel/DWHADHOCHqU/) |

| Name | Location | Description |
|------|----------|-------------|
| `X-API-Key` | header | Your API key (required) |

### Response

```json
{
  "url": "https://www.instagram.com/reel/DWHADHOCHqU/",
  "likes": 165,
  "caption": "I had no idea what it meant to lead my projects…",
  "comments": 2,
  "is_video": true,
  "post_url": "https://www.instagram.com/p/DWHADHOCHqU/",
  "shortcode": "DWHADHOCHqU",
  "video_url": "",
  "thumbnail_url": "https://scontent-ams2-1.cdninstagram.com/..."
}
```

---

## GET `get_profile`

Get Instagram profile information for oliviadeano including biography, follower/following counts, and profile picture.

```
GET https://api.parse.bot/scraper/e7348582-3fe0-40f5-abb5-58306ec6c982/get_profile
```

| Name | Location | Description |
|------|----------|-------------|
| `X-API-Key` | header | Your API key (required) |

### Response

```json
{
  "username": "oliviadeano",
  "biography": "‘the art of loving’ out now!",
  "full_name": "Olivia Dean",
  "posts_count": "304",
  "followers_count": "5M"
}
```

---

## GET `get_link_in_bio`

Get the user's Linkfire link-in-bio page with all sub-links, social media links, and images.

```
GET https://api.parse.bot/scraper/e7348582-3fe0-40f5-abb5-58306ec6c982/get_link_in_bio
```

| Name | Location | Description |
|------|----------|-------------|
| `X-API-Key` | header | Your API key (required) |

### Response

```json
{
  "links": [
    {
      "url": "http://oliviadean.lnk.to/theartofloving",
      "type": "image_link",
      "title": "The Art of Loving - out now"
    }
  ],
  "bio_link_url": "http://oliviadean.lnk.to/all",
  "social_links": [
    {
      "title": "Spotify",
      "service": "spotify"
    }
  ]
}
```

---
