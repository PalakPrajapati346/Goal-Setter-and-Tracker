import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    // 1. GITHUB LOGIN
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      async profile(profile) {
        // This checks if the user already exists in your TiDB
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email as string },
        });

        return {
          id: profile.id.toString(),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          // If they exist in DB, use their role, otherwise default to EMPLOYEE
          role: existingUser?.role ?? "EMPLOYEE", 
        };
      },
    }),

    // 2. EXISTING CREDENTIALS LOGIN
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;

        const user = await prisma.user.findUnique({ 
          where: { email: creds.email } 
        });

        if (!user || !user.passwordHash) return null;
        
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;

        return { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role 
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};