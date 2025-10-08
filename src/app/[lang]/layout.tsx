import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css"; // This path is now correct
import { ThemeProvider } from "@/components/ThemeProvider";
import NavBar from "@/components/NavBar";
import TranslationsProvider from "@/components/TranslationsProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Malenga Financial Literacy",
  description: "Your trusted source for financial literacy in Tanzania",
};

export default function RootLayout({
  children,
  params: { lang },
}: Readonly<{
  children: React.ReactNode;
  params: { lang: string };
}>) {
  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <TranslationsProvider locale={lang}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="relative flex min-h-screen flex-col">
              <NavBar />
              <main className="container mx-auto max-w-7xl flex-grow p-4 md:p-6">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </TranslationsProvider>
      </body>
    </html>
  );
}