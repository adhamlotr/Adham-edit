import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { JWT } from "next-auth/jwt";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";

declare module "next-auth" {
  interface User {
    role: "customer" | "admin";
  }
  interface Session {
    user: {
      id: string;
      role: "customer" | "admin";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "customer" | "admin";
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email),
        });
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        if (user.id) token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
