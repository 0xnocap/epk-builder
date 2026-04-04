# EPK Generator - Spec Sheet

## Product Name
EPK Generator (working title - needs brand name)

## One-Line Description
AI-powered single-page Electronic Press Kit builder for independent musicians.

## Problem
Independent artists need professional EPKs to book shows, pitch to blogs, get playlist placements, and present themselves to industry. Current options are either ugly template builders, expensive agencies, or DIY with no design skills. There's no tool that takes an artist's raw materials and generates a modern, animated, vibe-matched landing page automatically.

## Target User
Independent musicians, producers, DJs, bands - anyone releasing music who needs a professional web presence without hiring a designer or learning Webflow.

## Core Features (MVP)

### 1. Artist Input Flow
- Upload 3-10 images (press photos, album art, live shots)
- Submit social media URLs (Instagram, TikTok, X/Twitter, YouTube, Facebook)
- Link streaming profiles (Spotify, Apple Music, SoundCloud, YouTube Music)
- Choose brand colors OR auto-detect from uploaded images/artwork
- Text prompt or description: who they are, their sound, their story
- Contact/management info (email, manager name, booking email)
- Upcoming/relevant show dates (venue, city, date)

### 2. AI Generation
- Takes all submitted data and generates a single-page EPK layout
- Matches the artist's vibe based on imagery, colors, and description
- Modern design with animations and transitions (Framer Motion)
- Embedded Spotify/Apple Music players
- Social media links with icons
- Image gallery/hero sections
- Show dates section
- Contact/booking section
- Bio section generated/refined from artist prompt

### 3. Theme Modes
- Light mode
- Dark mode
- Unique color mode (derived from artist's brand colors)
- Smooth transitions between modes

### 4. Save & Publish
- Save progress / user profile
- Publish to a shareable URL (epkgenerator.com/artistname or similar)
- Download as static HTML (stretch goal)

### 5. Auth & Monetization
- Sign in with Google/socials (first-time visitors)
- Free tier: 3 iterations/renditions of your EPK
- Must sign up to:
  - Publish
  - Continue designing beyond 3 iterations
  - Create more than 1 EPK design
- Monthly: $9.99/mo
- Annual: $75.00/yr

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Auth**: NextAuth.js (Google, Twitter, Discord providers)
- **Database**: Supabase (Postgres + Auth + Storage)
- **Image Storage**: Supabase Storage
- **AI**: Claude API (layout generation, bio refinement, vibe matching)
- **Deployment**: Vercel

## Design Direction
- Dark-first, sleek, modern
- Terminal/tech-forward but accessible to non-tech musicians
- Bold typography, generous whitespace
- Accent colors pulled from artist's palette
- Micro-interactions on hover/scroll
- Glass morphism elements where appropriate
- The BUILDER interface should feel premium and minimal
- The GENERATED EPKs should feel unique per artist - not templated

## Pages (Builder App)
1. **Landing/Marketing page** - what the product is, examples, pricing
2. **Auth flow** - Google/social sign-in
3. **Builder flow** - step-by-step input wizard
4. **Preview** - live preview of generated EPK
5. **Dashboard** - manage your EPKs (paid users)

## MVP Scope (Today's Build)
Focus on the builder flow and EPK output:
1. Landing page with clear value prop
2. Multi-step input form (images, links, colors, bio, shows)
3. AI-generated EPK preview (at least 1 template style)
4. Light/dark/color mode toggle on the generated EPK
5. Framer Motion animations on the output

Auth, payments, and persistence are Phase 2. Today we nail the core experience: input your stuff, get a beautiful EPK.
