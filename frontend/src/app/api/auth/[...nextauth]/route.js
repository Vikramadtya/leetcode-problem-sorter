import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const isMockMode = process.env.NODE_ENV === 'development' && !hasGoogleAuth;

const providers = [];

if (hasGoogleAuth) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (isMockMode || !hasGoogleAuth) {
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
  providers,
  secret: process.env.NEXTAUTH_SECRET || "mock-secret-for-local-dev-only",
  session: {
    // We use JWT exclusively since DB management is offloaded to the Java Backend
    strategy: "jwt",
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
