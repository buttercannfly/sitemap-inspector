import type { NextApiRequest, NextApiResponse } from "next";
import { websiteApi } from "@/lib/api";
import { fetchSitemapUrls } from "@/lib/sitemapUtils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case "GET":
        const websites = await websiteApi.getAllWebsites();
        return res.status(200).json(websites);

      case "POST":
        const { website } = req.body;
        const urls = await fetchSitemapUrls(website);
        const urlString = urls.join(",");
        const newWebsite = await websiteApi.addWebsite(website, urlString);
        return res.status(201).json(newWebsite);

      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
