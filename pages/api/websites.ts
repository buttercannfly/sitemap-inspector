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
        const page = Number(req.query.page) || 1;
        const pageSize = Number(req.query.pageSize) || 10;
        const websites = await websiteApi.getRecentWebsites(page, pageSize);
        return res.status(200).json(websites);

      case "POST":
        const { website } = req.body;
        const urls = await fetchSitemapUrls(website);
        const urlString = urls.join(",");
        const newWebsite = await websiteApi.addWebsite(website, urlString);
        return res.status(201).json(newWebsite);

      case "DELETE":
        const { id } = req.body; // 假设传入的请求体中包含要删除的 ID
        await websiteApi.deleteWebsite(id);
        return res.status(204).end(); // No Content

      default:
        res.setHeader("Allow", ["GET", "POST", "DELETE"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
