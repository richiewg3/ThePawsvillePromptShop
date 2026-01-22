import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/navigation";

export const metadata: Metadata = {
  title: "The Pawsville Prompt Shop",
  description: "A Sora prompt compiler for creating structured, deterministic prompts for anthropomorphic character scenes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
            {children}
          </main>
          <footer className="py-3 sm:py-4 text-center text-xs sm:text-sm text-canvas-500">
            <p>The Pawsville Prompt Shop — Crafting prompts with care</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
