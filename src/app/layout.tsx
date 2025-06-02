import React from 'react';
import './globals.css';
import { Inter } from 'next/font/google';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import AuthProvider from '@/components/AuthProvider';
import { getServerSession } from 'next-auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'BoostT1D ⚡ - Smart Diabetes Management',
  description: 'Empowering Type 1 Diabetes Management with Smart Analytics, Community Connection, and Real-time Monitoring',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <AuthProvider>
          <Navigation />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
