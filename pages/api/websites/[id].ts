import type { NextApiRequest, NextApiResponse } from "next";
import { websiteApi } from "@/lib/api";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  console.log("id");
  console.log(id);

  try {
    switch (req.method) {
      case "DELETE":
        await websiteApi.deleteWebsite(Number(id));
        return res.status(204).end(); // No Content

      case "GET":
        const website = await websiteApi.getWebsiteById(Number(id));
        res.status(200).json(website);
        break;

      default:
        res.setHeader("Allow", ["GET", "DELETE"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch website" });
  }
}
