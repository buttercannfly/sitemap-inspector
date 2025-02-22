import { XMLParser } from "fast-xml-parser";
import axios from "axios";

const SITEMAP_PATHS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/sitemap-index.xml",
  "/wp-sitemap.xml", // WordPress
  "/sitemap/sitemap.xml",
  "/sitemaps/sitemap.xml",
  "/sitemap/index.xml",
  "/sitemap.php",
  "/sitemap.txt",
  "/sitemap/",
];

async function findSitemapInRobotsTxt(websiteUrl: string): Promise<string[]> {
  try {
    const response = await axios.get(
      `${websiteUrl.replace(/\/$/, "")}/robots.txt`
    );
    if (response.status === 200) {
      const robotsTxt = response.data;
      const sitemapUrls = robotsTxt
        .split("\n")
        .filter((line: string) => line.toLowerCase().startsWith("sitemap:"))
        .map((line: string) => line.split(": ")[1]?.trim())
        .filter(Boolean);
      return sitemapUrls;
    }
  } catch (error) {
    console.log("No robots.txt found or error parsing it", error);
  }
  return [];
}

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SitemapMonitor/1.0;)",
        },
      });
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

export async function fetchSitemapUrls(websiteUrl: string): Promise<string[]> {
  try {
    const baseUrl = websiteUrl.replace(/\/$/, "");
    let sitemapContent = "";
    let sitemapUrl = "";

    // 首先尝试从 robots.txt 中查找
    const robotsSitemaps = await findSitemapInRobotsTxt(baseUrl);
    for (const url of robotsSitemaps) {
      try {
        sitemapContent = await fetchWithRetry(url);
        sitemapUrl = url;
        break;
      } catch (error) {
        continue;
      }
    }

    // 如果 robots.txt 中没有找到，则尝试常见路径
    if (!sitemapContent) {
      for (const path of SITEMAP_PATHS) {
        try {
          const url = `${baseUrl}${path}`;
          sitemapContent = await fetchWithRetry(url);
          sitemapUrl = url;
          break;
        } catch (error) {
          continue;
        }
      }
    }

    if (!sitemapContent) {
      throw new Error("Sitemap not found");
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    // 处理纯文本格式的 sitemap
    if (
      typeof sitemapContent === "string" &&
      !sitemapContent.trim().startsWith("<?xml")
    ) {
      return sitemapContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && line.startsWith("http"));
    }

    const result = parser.parse(sitemapContent);

    // 处理 sitemap index
    if (result.sitemapindex) {
      const urls = [];
      const sitemaps = Array.isArray(result.sitemapindex.sitemap)
        ? result.sitemapindex.sitemap
        : [result.sitemapindex.sitemap];

      for (const sitemap of sitemaps) {
        try {
          const subSitemapContent = await fetchWithRetry(sitemap.loc);
          const subSitemapResult = parser.parse(subSitemapContent);
          if (subSitemapResult.urlset?.url) {
            const subUrls = Array.isArray(subSitemapResult.urlset.url)
              ? subSitemapResult.urlset.url
              : [subSitemapResult.urlset.url];
            urls.push(...subUrls.map((u: any) => u.loc));
          }
        } catch (error) {
          console.error(`Error fetching sub-sitemap ${sitemap.loc}:`, error);
          continue;
        }
      }
      return urls;
    }

    // 处理普通 sitemap
    if (result.urlset?.url) {
      const urls = Array.isArray(result.urlset.url)
        ? result.urlset.url
        : [result.urlset.url];
      return urls.map((u: any) => u.loc);
    }

    return [];
  } catch (error) {
    console.error("Error fetching sitemap:", error);
    throw error;
  }
}
