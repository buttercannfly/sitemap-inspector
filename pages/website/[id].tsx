import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Website } from '@/lib/supabaseClient';

export default function WebsiteDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchWebsiteDetail();
    }
  }, [id]);

  const fetchWebsiteDetail = async () => {
    try {
      const response = await fetch(`/api/websites/${id}`);
      const data = await response.json();
      console.log(data)
      setWebsite(data);
    } catch (error) {
      console.error('Failed to fetch website detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!website) {
    return <div className="p-6">Website not found</div>;
  }

  const urlsArray = website.urls.split(',').filter(Boolean);
  const previousUrlsArray = website.previous_urls ? website.previous_urls.split(',').filter(Boolean) : [];
  console.log(urlsArray)
  console.log(previousUrlsArray)
  
  const newUrls = urlsArray.filter(url => !previousUrlsArray.includes(url));
  console.log(newUrls)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button 
          onClick={() => router.back()} 
          className="text-blue-500 hover:text-blue-600"
        >
          ← Back
        </button>
      </div>

      
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">{website.website}</h1>
        <p className="text-gray-500 mb-6">
          Last updated: {new Date(website.created_at).toLocaleString()}
        </p>

        {newUrls.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4 text-green-600">
              New URLs ({newUrls.length}):
            </h2>
            <div className="space-y-2">
              {newUrls.map((url) => (
                <div 
                  key={url} 
                  className="p-2 bg-green-50 dark:bg-green-900 rounded break-all"
                >
                  <a 
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline"
                  >
                    {url}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div>
          <h2 className="text-xl font-semibold mb-4">
            All URLs ({urlsArray.length})
          </h2>
          <div className="space-y-2">
            {urlsArray.map((url) => (
              <div 
                key={url} 
                className="p-2 bg-gray-50 dark:bg-gray-700 rounded break-all"
              >
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600"
                >
                  {url}
                </a>
              </div>
            ))}
          </div>
        </div>

       
      </div>
    </div>
  );
} 