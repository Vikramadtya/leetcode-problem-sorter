import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const hasDb = !!process.env.DATABASE_URL;
const isMockMode = process.env.NODE_ENV === 'development' && (!hasDb || !hasGoogleAuth);

const providers = [];

if (hasGoogleAuth) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (isMockMode) {
  providers.push(
    CredentialsProvider({
      name: "Mock Login (Local Dev)",
      credentials: {
        username: { label: "Username (any)", type: "text", placeholder: "test" },
        password: { label: "Password (any)", type: "password", placeholder: "test" }
      },
      async authorize(credentials) {
        // Accept any login in mock mode
        return { id: "mock-user-1", name: credentials?.username || "Test User", email: "test@example.com" };
      }
    })
  );
}

export const authOptions = {
  ...((hasDb && !isMockMode) ? { adapter: PrismaAdapter(prisma) } : {}),
  providers,
  secret: process.env.NEXTAUTH_SECRET || "mock-secret-for-local-dev-only",
  session: {
    // Force JWT session if in mock mode or missing DB
    strategy: (!hasDb || isMockMode) ? "jwt" : "database",
  },
  callbacks: {
    session: async ({ session, token, user }) => {
      if (session?.user) {
        session.user.id = user?.id || token?.sub; 
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
