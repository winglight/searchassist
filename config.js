// 默认搜索配置
const DEFAULT_SEARCH_CONFIG = [
  {
    id: "search_taobao",
    title: "在淘宝上搜索 '%s'",
    url: "http://s.taobao.com/search?q=%s"
  },
  {
    id: "search_ebook",
    title: "在b-ok上搜索电子书 '%s'",
    url: "https://annas-archive.org/search?q=%s"
  },
  {
    id: "search_movie",
    title: "在BD影视查找 '%s'",
    url: "https://www.rrdynb.com/plus/search.php?q=%s"
  },
  {
    id: "search_acg",
    title: "在ACG搜索动漫 '%s'",
    url: "https://www.agefans.cc/search?query=%s&page=1"
  },
  {
    id: "search_jd",
    title: "在京东上搜索 '%s'",
    url: "https://search.jd.com/Search?keyword=%s&enc=utf-8"
  },
  {
    id: "search_baidupan",
    title: "在网盘搜索资源 '%s'",
    url: "https://www.alipansou.com/search?k=%s"
  }
];

// 加载搜索配置
async function loadSearchConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get('searchConfig', (result) => {
      if (result.searchConfig) {
        resolve(result.searchConfig);
      } else {
        // 首次使用，保存默认配置
        chrome.storage.local.set({ 'searchConfig': DEFAULT_SEARCH_CONFIG });
        resolve(DEFAULT_SEARCH_CONFIG);
      }
    });
  });
}

// 保存搜索配置
function saveSearchConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ 'searchConfig': config }, () => {
      resolve();
    });
  });
}

export { DEFAULT_SEARCH_CONFIG, loadSearchConfig, saveSearchConfig };