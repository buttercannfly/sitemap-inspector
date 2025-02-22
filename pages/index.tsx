import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import WebsiteMonitor from '@/components/WebsiteMonitor';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Sitemap Monitor
        </h1>
        <WebsiteMonitor />
      </main>
    </div>
  );
}
