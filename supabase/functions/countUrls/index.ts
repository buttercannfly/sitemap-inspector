// Edge Function for Supabase (save as countUrls.ts in your edge functions directory)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Initialize Supabase client with environment variables
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");

    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Query to get websites with calculated URL count but without the actual URLs
    const { data, error, count } = await supabaseClient
      .from("website")
      .select(
        `
        id, 
        created_at, 
        website, 
        previous_urls,
        (SELECT count(*) FROM (
          SELECT unnest(string_to_array(urls, ',')) as url 
          WHERE trim(url) != ''
        ) as url_counts)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Process the results
    const websitesWithCount = data.map((website) => ({
      id: website.id,
      created_at: website.created_at,
      website: website.website,
      previous_urls: website.previous_urls,
      url_count: parseInt(website.count || "0"),
    }));

    // Return the processed data with pagination info
    return new Response(
      JSON.stringify({
        data: websitesWithCount,
        pagination: {
          total: count,
          page,
          pageSize,
          totalPages: Math.ceil(count / pageSize),
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Client-side API in your application
export const websiteApi = {
  // Get websites with pagination
  async getWebsites(page = 1, pageSize = 10) {
    const { data, error } = await supabase.functions.invoke("countUrls", {
      body: { page, pageSize },
    });

    if (error) throw error;
    return data;
  },

  // Get the three most recent website snapshots
  async getRecentWebsiteSnapshots(websiteId) {
    const { data, error } = await supabase
      .from("website")
      .select("id, created_at, website, url_count")
      .eq("website", websiteId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) throw error;
    return data as WebsiteSnapshot[];
  },
};

// Updated interfaces
export interface Website {
  id: number;
  created_at: string;
  website: string;
  previous_urls: string;
  url_count: number;
}

export interface WebsiteSnapshot {
  id: number;
  created_at: string;
  website: string;
  url_count: number;
}

// Example usage with pagination
export const WebsiteList = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const fetchWebsites = async () => {
      const result = await websiteApi.getWebsites(page, pageSize);
      setWebsites(result.data);
      setPagination(result.pagination);
    };

    fetchWebsites();
  }, [page, pageSize]);

  // Component JSX
  // ...
};
