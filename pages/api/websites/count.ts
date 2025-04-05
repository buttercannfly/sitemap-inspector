import type { NextApiRequest, NextApiResponse } from "next";
import { websiteApi } from "@/lib/api";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // 获取所有不同的网站 URLs
    const uniqueWebsites = await websiteApi.getAllDistinctWebsites();
    
    // 返回唯一网站数量
    return res.status(200).json({ count: uniqueWebsites.length });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Failed to get website count" });
  }
} 