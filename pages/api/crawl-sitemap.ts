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

  const { website } = req.body;
  console.log("process:" + website);

  // 立即返回响应
  res.status(200).json({ success: true });

  // 异步操作在后台进行
  Promise.resolve()
    .then(async () => {
      const urls = await fetchSitemapUrls(website);
      await websiteApi.addWebsite(website, urls.join(","));
    })
    .catch((error) => {
      console.error("Error crawling sitemap:", error);
    });
}
