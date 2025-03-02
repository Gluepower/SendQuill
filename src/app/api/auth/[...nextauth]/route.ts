import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: process.env.NODE_ENV === "development",
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          // Request basic profile data first, we can request gmail.send permission later
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token and refresh_token to the token
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
      }
      return token;
    },
    async session({ session, token }) {
      // Add access token and refresh token to the session
      session.user = session.user || {};
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.error = token.error;
      
      return session;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  logger: {
    error(code, metadata) {
      console.error(`Auth error: ${code}`, metadata);
    },
    warn(code) {
      console.warn(`Auth warning: ${code}`);
    },
    debug(code, metadata) {
      console.log(`Auth debug: ${code}`, metadata);
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 