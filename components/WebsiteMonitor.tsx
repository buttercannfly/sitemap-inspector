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

      <div className="space-y-6">
        {(websites??[]).map((site, index) => {
          const previousSite = websites[index + 1];
          const newUrls = previousSite 
            ? compareUrls(site.urls, previousSite.urls)
            : [];
          const isExpanded = expandedSites[site.id] || false;
          const urlsArray = site.urls.split(',').filter(Boolean);

          return (
            <div key={site.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold">{site.website}</h3>
                  <p className="text-sm text-gray-500">
                    Last updated: {new Date(site.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => toggleExpand(site.id)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {isExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>

              {isExpanded && (
                <div className="mt-4 border-t pt-4">
                  {newUrls.length > 0 && (
                    <>
                      <p className="text-sm font-semibold mb-2">
                        New URLs ({newUrls.length}):
                      </p>
                      <div className="space-y-1 mb-4">
                        {newUrls.map((url) => (
                          <div 
                            key={url} 
                            className="text-sm text-green-600 dark:text-green-400 break-all bg-green-50 dark:bg-green-900/20 p-2 rounded"
                          >
                            {url}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <p className="text-sm font-semibold mb-2">
                    All URLs ({urlsArray.length}):
                  </p>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {urlsArray.map((url) => (
                      <div 
                        key={url} 
                        className="text-sm text-gray-600 dark:text-gray-400 break-all"
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
  );
} 