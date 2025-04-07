// 加载搜索配置
async function loadSearchConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get('searchConfig', (result) => {
      if (result.searchConfig) {
        resolve(result.searchConfig);
      } else {
        // 首次使用，加载默认配置
        fetch(chrome.runtime.getURL('config.js'))
          .then(response => response.text())
          .then(text => {
            // 提取DEFAULT_SEARCH_CONFIG的值
            const match = text.match(/const DEFAULT_SEARCH_CONFIG = (\[[\s\S]*?\]);/);
            if (match && match[1]) {
              const config = JSON.parse(match[1].replace(/\s+/g, ' '));
              chrome.storage.local.set({ 'searchConfig': config });
              resolve(config);
            }
          });
      }
    });
  });
}

// 通用点击回调函数
async function genericOnClick(info, tab) {
  const key = info.selectionText;
  const config = await loadSearchConfig();
  
  // 查找匹配的菜单项
  const menuItem = config.find(item => item.id === info.menuItemId);
  if (!menuItem) return;
  
  // 替换URL中的占位符
  let url = menuItem.url.replace(/%s/g, encodeURIComponent(key));
  
  console.log("url: " + url);
  chrome.tabs.create({ url: url });
}

// 创建上下文菜单项
async function createContextMenus() {
  // 先清除所有现有菜单
  chrome.contextMenus.removeAll();
  
  // 加载配置并创建菜单
  const config = await loadSearchConfig();
  const context = "selection";
  
  config.forEach(item => {
    chrome.contextMenus.create({
      "id": item.id,
      "title": item.title,
      "contexts": [context]
    });
  });
}

// 安装或更新时创建菜单
chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
});

// 启动时重新创建菜单（以防配置已更改）
chrome.runtime.onStartup.addListener(() => {
  createContextMenus();
});

// 监听存储变化，更新菜单
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.searchConfig) {
    createContextMenus();
  }
});

// 添加点击事件监听器
chrome.contextMenus.onClicked.addListener(genericOnClick);
