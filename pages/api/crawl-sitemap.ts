import type { NextApiRequest, NextApiResponse } from "next";
import { websiteApi } from "@/lib/api";
import { fetchSitemapUrls } from "@/lib/sitemapUtils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { website } = req.body;
    // const website = await websiteApi.getWebsiteById(websiteId);

    const urls = await fetchSitemapUrls(website);
    await websiteApi.addWebsite(website, urls.join(","));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error crawling sitemap:", error);
    res.status(500).json({ error: "Failed to crawl sitemap" });
  }
}
