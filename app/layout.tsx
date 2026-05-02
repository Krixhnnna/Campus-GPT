import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: "Campus GPT | LPU Smart Assistant",
  description: "The intelligent chatbot for Lovely Professional University (LPU)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const bgs = ['/lpu-bg.jpg', '/lpu-bg-2.jpg'];
              const bg = bgs[Math.floor(Math.random() * bgs.length)];
              document.documentElement.style.setProperty('--random-bg', "url('" + bg + "')");
            `,
          }}
        />
      </head>
      <body className={outfit.className}>{children}</body>
    </html>
  );
}
