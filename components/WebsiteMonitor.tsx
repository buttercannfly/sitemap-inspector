import { useState, useEffect } from 'react';
import { Website } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function WebsiteMonitor() {
  const router = useRouter();
  const [website, setWebsite] = useState('');
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});
  const [refreshingSites, setRefreshingSites] = useState<Record<number, boolean>>({});
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: Number(router.query.page) || 1,
    pageSize: Number(router.query.pageSize) || 10,
    total: 0
  });
  
  // Update pagination when URL parameters change
  useEffect(() => {
    const page = Number(router.query.page) || 1;
    const pageSize = Number(router.query.pageSize) || 10;
    
    setPagination(prev => ({
      ...prev,
      page,
      pageSize
    }));
  }, [router.query.page, router.query.pageSize]);
  
  // Fetch websites when pagination changes
  useEffect(() => {
    fetchWebsites();
  }, [pagination.page, pagination.pageSize]); 

  const fetchWebsites = async () => {
    try {
      setPaginationLoading(true);
      
      // 首先获取总的唯一网站数
      const countResponse = await fetch('/api/websites/count');
      const countData = await countResponse.json();
      const uniqueTotal = countData.count || 0;
      
      // 更新总数，用于计算正确的分页
      setPagination(prev => ({ 
        ...prev, 
        total: uniqueTotal
      }));
      
      if (uniqueTotal === 0) {
        setWebsites([]);
        setPaginationLoading(false);
        return;
      }
      
      // 计算需要获取的网站数量和页码
      // 因为每个网站最多有3条记录，我们需要获取足够多的数据来确保有足够的唯一网站
      const multiplier = 3;
      const effectivePageSize = pagination.pageSize * multiplier;
      
      // 计算偏移量以获取正确的数据范围
      const offset = (pagination.page - 1) * pagination.pageSize;
      // 获取比当前页需要更多的数据，以确保我们有足够的唯一网站
      const limit = pagination.pageSize * 2;
      
      // 获取网站数据
      const apiPage = Math.floor(offset / (pagination.pageSize * multiplier)) + 1;
      const response = await fetch(`/api/websites?page=${apiPage}&pageSize=${effectivePageSize}`);
      const data = await response.json();
      
      if (data && data.data) {
        // 按网站URL分组，每个网站只保留最新的一条记录
        const websiteMap = new Map<string, Website>();
        data.data.forEach((site: Website) => {
          if (!websiteMap.has(site.website) || 
              new Date(site.created_at) > new Date(websiteMap.get(site.website)!.created_at)) {
            websiteMap.set(site.website, site);
          }
        });
        
        // 转换为数组并排序（可选）
        const uniqueWebsites = Array.from(websiteMap.values())
          .sort((a, b) => a.website.localeCompare(b.website));
        
        // 从唯一网站中截取当前页需要的数据
        const paginatedWebsites = uniqueWebsites.slice(0, pagination.pageSize);
        
        setWebsites(paginatedWebsites);
      } else {
        setWebsites([]);
        setError('Invalid data format received');
      }
    } catch (err) {
      setError('Failed to fetch websites');
      console.log(err);
    } finally {
      setPaginationLoading(false);
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

      // Reset to first page and update router
      router.push({
        pathname: router.pathname,
        query: { ...router.query, page: 1 }
      });
      setWebsite('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add website');
    } finally {
      setLoading(false);
    }
  };

  // Update URL when page changes
  const handlePageChange = (newPage: number) => {
    const totalPages = Math.ceil(pagination.total / pagination.pageSize);
    if (newPage < 1 || newPage > totalPages) return; // Prevent out-of-bounds
    
    router.push({
      pathname: router.pathname,
      query: { ...router.query, page: newPage }
    }, undefined, { shallow: true });
  };

  // Update URL when page size changes
  const handlePageSizeChange = (newSize: number) => {
    router.push({
      pathname: router.pathname,
      query: { ...router.query, pageSize: newSize, page: 1 }
    }, undefined, { shallow: true });
  };

  const compareUrls = (current: string, previous: string) => {
    if (!previous) return [];
    const currentUrls = new Set(current.split(',').filter(Boolean));
    const previousUrls = new Set(previous.split(',').filter(Boolean));
    return Array.from(currentUrls).filter(url => !previousUrls.has(url));
  };

  const toggleDomain = (domain: string) => {
    setExpandedDomains(prev => ({
      ...prev,
      [domain]: !prev[domain]
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

  const getUrlCount = (urlString: string): number => {
    return urlString.split(',').filter(Boolean).length;
  };

  const handleRefresh = async (site: Website) => {
    setRefreshingSites(prev => ({ ...prev, [site.id]: true }));
    try {
      const response = await fetch('/api/crawl-sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: site.website }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh sitemap');
      }

      await fetchWebsites();
    } catch (error) {
      console.error('Error refreshing sitemap:', error);
    } finally {
      setRefreshingSites(prev => ({ ...prev, [site.id]: false }));
    }
  };

  const handleDelete = async (siteId: number) => {
    if (confirm("Are you sure you want to delete this website?")) {
      try {
        const response = await fetch(`/api/websites/${siteId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete website');
        }

        // Calculate new total and update page if needed
        const newTotal = pagination.total - 1;
        const totalPages = Math.ceil(newTotal / pagination.pageSize);
        
        if (pagination.page > totalPages && totalPages > 0) {
          router.push({
            pathname: router.pathname,
            query: { ...router.query, page: totalPages }
          }, undefined, { shallow: true });
        } else {
          // Just refresh the current page
          fetchWebsites();
        }
      } catch (error) {
        setError('Failed to delete website');
        console.error(error);
      }
    }
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

      <div className="space-y-8">
        {Object.entries(groupWebsitesByDomain(websites)).map(([domain, siteGroup]) => (
          <div key={domain} className="border rounded-lg p-6 bg-white dark:bg-gray-800">
            <button 
              onClick={() => toggleDomain(domain)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-xl font-bold pb-2">
                {domain}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({siteGroup.length} {siteGroup.length === 1 ? 'site' : 'sites'})
                </span>
              </h2>
              <svg 
                className={`w-6 h-6 transform transition-transform ${expandedDomains[domain] ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedDomains[domain] && (
              <div className="space-y-4 mt-4">
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
                          <p className="text-sm text-gray-500">
                            Total URLs: {site.url_count}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleRefresh(site);
                            }}
                            disabled={refreshingSites[site.id]}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {refreshingSites[site.id] ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-gray-700" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>刷新中</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>重新抓取</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(site.id)}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            删除
                          </button>
                          <a
                            href={`/website/${site.id}`}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          >
                            View URLs
                          </a>
                        </div>
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
                                <a 
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 hover:underline"
                                >
                                  {url}
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <select
          value={pagination.pageSize}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          className="px-2 py-1 border rounded"
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
        <span className="text-sm text-gray-600">
          {paginationLoading ? (
            'Loading...'
          ) : pagination.total === 0 ? (
            'No websites found'
          ) : (
            `Showing ${(pagination.page - 1) * pagination.pageSize + 1} - 
            ${Math.min(pagination.page * pagination.pageSize, pagination.total)} of 
            ${pagination.total} websites`
          )}
        </span>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1 || paginationLoading}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 flex items-center gap-2"
        >
          {paginationLoading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          Previous
        </button>
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize) || paginationLoading}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 flex items-center gap-2"
        >
          Next
          {paginationLoading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
        </button>
      </div>
    </div>
    </div>
  );
}