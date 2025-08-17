import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function PersonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navigation />
      {children}
      <Footer />
    </>
  );
}

