import { supabase, Website } from "./supabaseClient";

export const websiteApi = {
  // 获取所有网站
  async getAllWebsites() {
    const { data, error } = await supabase
      .from("website")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Website[];
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
    const { data, error } = await supabase
      .from("website")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Website;
  },
};
