import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { OAuthConfig } from "next-auth/providers";

// Custom Instagram provider using the new Instagram API with Instagram Login
// (Meta deprecated the old Basic Display API)
function Instagram(): OAuthConfig<any> {
  return {
    id: "instagram",
    name: "Instagram",
    type: "oauth",
    authorization: {
      url: "https://www.instagram.com/oauth/authorize",
      params: {
        scope: "instagram_business_basic,instagram_business_content_publish",
        response_type: "code",
      },
    },
    token: {
      url: "https://api.instagram.com/oauth/access_token",
      async request({ params, provider }: { params: any; provider: any }) {
        const res = await fetch("https://api.instagram.com/oauth/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: provider.clientId!,
            client_secret: provider.clientSecret!,
            grant_type: "authorization_code",
            redirect_uri: params.redirect_uri!,
            code: params.code!,
          }),
        });
        const data = await res.json();

        // Exchange short-lived token for long-lived token
        const longRes = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${provider.clientSecret}&access_token=${data.access_token}`
        );
        const longData = await longRes.json();

        return {
          tokens: {
            access_token: longData.access_token || data.access_token,
            token_type: "bearer",
            expires_at: longData.expires_in
              ? Math.floor(Date.now() / 1000) + longData.expires_in
              : undefined,
          },
        };
      },
    },
    userinfo: {
      url: "https://graph.instagram.com/v22.0/me",
      params: {
        fields:
          "id,username,name,biography,profile_picture_url,followers_count,media_count",
      },
    },
    profile(profile) {
      return {
        id: profile.id,
        name: profile.name || profile.username,
        email: null,
        image: profile.profile_picture_url || null,
      };
    },
    clientId: process.env.INSTAGRAM_CLIENT_ID!,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Instagram(),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        // Store IG profile data in the token for later use
        if (account.provider === "instagram" && profile) {
          token.igProfile = {
            username: (profile as any).username,
            biography: (profile as any).biography,
            profilePicUrl: (profile as any).profile_picture_url,
            followersCount: (profile as any).followers_count,
            mediaCount: (profile as any).media_count,
          };
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).provider = token.provider;
      if (token.igProfile) {
        (session as any).igProfile = token.igProfile;
      }
      return session;
    },
  },
});
