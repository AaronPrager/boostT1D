import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from "bcryptjs";

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔐 authorize() called with credentials:', { 
          email: credentials?.email, 
          hasPassword: !!credentials?.password 
        });

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials:', { 
            hasEmail: !!credentials?.email, 
            hasPassword: !!credentials?.password 
          });
          throw new Error('Email and password are required');
        }

        try {
          console.log('🔍 Looking up user in database...');
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          });

          if (!user) {
            console.log('❌ User not found for email:', credentials.email);
            throw new Error('User not found');
          }

          if (!user.password) {
            console.log('❌ User found but has no password:', { userId: user.id, email: user.email });
            throw new Error('Account not confirmed');
          }

          // Check if email is confirmed
          if (!user.emailConfirmed) {
            console.log('❌ User email not confirmed:', { userId: user.id, email: user.email });
            throw new Error('Account not confirmed');
          }

          console.log('🔑 User found, comparing passwords...');
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.log('❌ Password validation failed for user:', { userId: user.id, email: user.email });
            throw new Error('Invalid password');
          }

          console.log('✅ Authentication successful for user:', { userId: user.id, email: user.email, name: user.name });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error('💥 Error during authentication:', error);
          throw error; // Re-throw the error so NextAuth can handle it
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    signOut: '/',
  },
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = (user?.id || token?.sub) as string;
      }
      return session;
    },
    async jwt({ token, user }) {
        if (user) {
        token.id = user.id;
        }
        return token;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `http://192.168.1.8:3001${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      // Default redirect to home page
      return `http://192.168.1.8:3001/`
    },
  },
  session: {
    strategy: 'jwt',
  },
}; 