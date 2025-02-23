import { useState, useEffect } from 'react';
import { Website } from '@/lib/supabaseClient';

export default function WebsiteMonitor() {
  const [website, setWebsite] = useState('');
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSites, setExpandedSites] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      const response = await fetch('/api/websites');
      const data = await response.json();
      setWebsites(data);
    } catch (err) {
      setError('Failed to fetch websites');
      console.log(err)
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ website }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add website');
      }

      await fetchWebsites();
      setWebsite('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add website');
    } finally {
      setLoading(false);
    }
  };

  const compareUrls = (current: string, previous: string) => {
    if (!previous) return [];
    const currentUrls = new Set(current.split(',').filter(Boolean));
    const previousUrls = new Set(previous.split(',').filter(Boolean));
    return Array.from(currentUrls).filter(url => !previousUrls.has(url));
  };

  const toggleExpand = (id: number) => {
    setExpandedSites(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  function groupWebsitesByDomain(websites: Website[]) {
    const groups: Record<string, Website[]> = {};
    
    websites.forEach(site => {
      try {
        const url = new URL(site.website);
        const domain = url.hostname;
        if (!groups[domain]) {
          groups[domain] = [];
        }
        groups[domain].push(site);
      } catch (error) {
        // Handle invalid URLs
        if (!groups['Other']) {
          groups['Other'] = [];
        }
        groups['Other'].push(site);
      }
    });
    
    return groups;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-4">
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="Enter website URL"
            required
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Website'}
          </button>
        </div>
        {error && <p className="mt-2 text-red-500">{error}</p>}
      </form>

      <div className="space-y-8">
        {Object.entries(groupWebsitesByDomain(websites)).map(([domain, siteGroup]) => (
          <div key={domain} className="border rounded-lg p-6 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b">
              {domain}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({siteGroup.length} {siteGroup.length === 1 ? 'site' : 'sites'})
              </span>
            </h2>
            
            <div className="space-y-4">
              {siteGroup.map((site) => {
                const newUrls = compareUrls(site.urls, site.previous_urls || '');
                
                return (
                  <div key={site.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{site.website}</h3>
                        <p className="text-sm text-gray-500">
                          Last updated: {new Date(site.created_at).toLocaleString()}
                        </p>
                      </div>
                      <a
                        href={`/website/${site.id}`}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        View URLs
                      </a>
                    </div>
                    {newUrls.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                          New URLs ({newUrls.length}):
                        </p>
                        <div className="mt-2 space-y-1">
                          {newUrls.map((url) => (
                            <div 
                              key={url} 
                              className="text-sm break-all bg-green-50 dark:bg-green-900/20 p-2 rounded"
                            >
                              {url}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 