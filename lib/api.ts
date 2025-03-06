import { supabase, Website } from "./supabaseClient";

export const websiteApi = {
  // 获取所有网站
  async getRecentWebsites(page = 1, pageSize = 10) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("recent_website_scrapes")
      .select("id, created_at, website, url_count", { count: "exact" })
      .filter("rn", "lte", 3) // 只取每个网站的前三次抓取
      .order("website", { ascending: true })
      .order("created_at", { ascending: false })
      .range(from, to); // 分页

    if (error) throw error;

    return { data, total: count };
  }, 

  async getAllDistinctWebsites() {
    const { data, error } = await supabase
      .from("website")
      .select("website") // 只选择 website 字段
      .order("created_at", { ascending: false })
      .neq("website", null); // 可选：排除空值

    if (error) throw error;

    // 提取 website 值并去重
    const uniqueWebsites = [...new Set(data.map((item) => item.website))];
    return uniqueWebsites as string[];
  },

  // 添加新网站
  async addWebsite(website: string, urls: string) {
    const { data, error } = await supabase
      .from("website")
      .insert([{ website, urls }])
      .select();

    if (error) throw error;
    return data[0] as Website;
  },

  // 更新网站信息
  async updateWebsite(id: number, updates: Partial<Website>) {
    const { data, error } = await supabase
      .from("website")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0] as Website;
  },

  // 删除网站
  async deleteWebsite(id: number) {
    const { error } = await supabase.from("website").delete().eq("id", id);

    if (error) throw error;
    return true;
  },

  // 获取单个网站信息
  async getWebsiteById(id: number) {
    // 首先获取当前网站的基本信息
    const { data: currentData, error: currentError } = await supabase
      .from("website")
      .select("*")
      .eq("id", id)
      .single();

    // console.log(currentData);
    if (currentError) throw currentError;

    // 获取同一网站（根据name）的历史抓取记录（排除当前记录）
    const { data: historyData, error: historyError } = await supabase
      .from("website")
      .select("urls, created_at, id")
      .eq("website", currentData.website) // 根据网站名称筛选
      // .neq("id", id) // 排除当前记录
      .order("created_at", { ascending: false }); // 按时间倒序排列
    console.log(historyData);

    if (historyError) throw historyError;

    // 找到当前记录在历史中的位置
    const currentIndex = historyData.findIndex((item) => item.id === id);

    console.log(currentIndex);

    // 取当前记录的下一条记录（即上一次抓取）
    const previousRecord =
      currentIndex === -1 || currentIndex + 1 >= historyData.length
        ? null
        : historyData[currentIndex + 1];

    return {
      ...currentData,
      previous_urls: previousRecord ? previousRecord.urls : "",
    } as Website;
  },

  // 获取所有网站（不包括 urls 字段）
  async getAllWebsitesWithoutUrls() {
    const { data, error } = await supabase
      .from("website")
      .select("id, created_at, website") // 只选择 id, created_at 和 website 字段
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Website[];
  },
};
