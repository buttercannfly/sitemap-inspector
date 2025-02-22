import type { NextApiRequest, NextApiResponse } from "next";
import { websiteApi } from "@/lib/api";

// 这个 API 路由应该被配置为只能由 cron job 调用
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 验证请求来源
  // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
  //   return res.status(401).json({ error: "Unauthorized" });
  // }

  try {
    const websites = await websiteApi.getAllWebsites();

    // 并行处理所有网站的爬取
    await Promise.all(
      websites.map(async (website) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/crawl-sitemap`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ websiteId: website.id }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to crawl ${website.website}`);
        }
      })
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Cron job error:", error);
    res.status(500).json({ error: "Failed to process cron job" });
  }
}
