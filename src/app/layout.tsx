import './globals.css';
import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Malenga Knowledge Clinic',
  description: 'Investing in the Tanzanian context: bonds, DSE stocks, UTT, and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
