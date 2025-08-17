import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function PersonalProfileLayout({
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

