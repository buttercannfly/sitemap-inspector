import WebsiteMonitor from '@/components/WebsiteMonitor';

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
