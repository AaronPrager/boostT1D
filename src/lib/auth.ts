import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
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
    error: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      console.log('NextAuth session callback:', { session, token });
      if (session.user && token) {
        session.user.id = token.sub as string;
        console.log('Set session user ID:', token.sub);
        
        // Fetch user details from database to get the name
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: { name: true, email: true }
          });
          
          if (user) {
            session.user.name = user.name;
            session.user.email = user.email;
            console.log('Set session user name:', user.name);
          }
        } catch (error) {
          console.error('Error fetching user details for session:', error);
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      console.log('NextAuth redirect called:', { url, baseUrl });
      
      // If a specific URL is provided, use it
      if (url && url !== baseUrl) {
        console.log('Redirecting to provided URL:', url);
        return url;
      }
      
      // Use the current request URL to get the correct port
      const currentUrl = process.env.NEXTAUTH_URL || baseUrl;
      console.log('Current URL:', currentUrl);
      console.log('Redirecting to welcome page:', `${currentUrl}/welcome`);
      return `${currentUrl}/welcome`;
    },
  },
  session: {
    strategy: 'jwt',
  },
}; 