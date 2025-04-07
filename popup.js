import { loadSearchConfig, saveSearchConfig } from './config.js';
import { R2Sync } from './r2-sync.js';

let searchConfig = [];
const r2Sync = new R2Sync();

// 初始化国际化
function initI18n() {
  // 设置页面上所有带有 data-i18n 属性的元素的文本
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = chrome.i18n.getMessage(key);
  });
  
  // 设置当前语言选择器的值
  const currentLocale = chrome.i18n.getUILanguage();
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    // 如果当前语言是中文，选择中文选项
    if (currentLocale.startsWith('zh')) {
      languageSelect.value = 'zh_CN';
    } else {
      languageSelect.value = 'en';
    }
  }
}

// 初始化页面
async function initPage() {
  // 初始化国际化
  initI18n();
  
  // 添加语言切换事件
  document.getElementById('language-select').addEventListener('change', function() {
    const newLocale = this.value;
    chrome.storage.local.set({ 'locale': newLocale }, () => {
      // 重新加载页面以应用新语言
      window.location.reload();
    });
  });
  
  // 尝试从R2同步配置
  if (r2Sync.config.enabled) {
    try {
      const r2Config = await r2Sync.loadFromR2('searchConfig');
      if (r2Config) {
        searchConfig = r2Config;
        await saveSearchConfig(searchConfig);
      } else {
        searchConfig = await loadSearchConfig();
      }
    } catch (error) {
      console.error('Failed to load from R2:', error);
      searchConfig = await loadSearchConfig();
    }
  } else {
    searchConfig = await loadSearchConfig();
  }
  
  renderSearchItems();
}

// 渲染搜索项
function renderSearchItems() {
  const container = document.getElementById('search-items-container');
  container.innerHTML = '';
  
  searchConfig.forEach((item, index) => {
    const itemElement = document.createElement('div');
    itemElement.className = 'search-item';
    itemElement.innerHTML = `
      <div class="form-group">
        <label for="id-${index}">${chrome.i18n.getMessage("id_label")}</label>
        <input type="text" id="id-${index}" value="${item.id}" readonly>
      </div>
      <div class="form-group">
        <label for="title-${index}">${chrome.i18n.getMessage("title_label")}</label>
        <input type="text" id="title-${index}" value="${item.title}">
      </div>
      <div class="form-group">
        <label for="url-${index}">${chrome.i18n.getMessage("url_label")}</label>
        <input type="text" id="url-${index}" value="${item.url}">
      </div>
      <button class="delete" data-index="${index}">${chrome.i18n.getMessage("delete_button")}</button>
    `;
    container.appendChild(itemElement);
    
    // 添加删除按钮事件
    itemElement.querySelector('.delete').addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      searchConfig.splice(index, 1);
      renderSearchItems();
    });
  });
}

// 添加新搜索项
function addSearchItem() {
  const newId = `search_custom_${Date.now()}`;
  searchConfig.push({
    id: newId,
    title: chrome.i18n.getMessage("search_taobao").replace('淘宝', 'Google'),
    url: "https://www.google.com/search?q=%s"
  });
  renderSearchItems();
}

// 保存配置
async function saveConfig() {
  // 从表单中获取更新后的值
  searchConfig = searchConfig.map((item, index) => {
    return {
      id: document.getElementById(`id-${index}`).value,
      title: document.getElementById(`title-${index}`).value,
      url: document.getElementById(`url-${index}`).value
    };
  });
  
  // 保存到本地存储
  await saveSearchConfig(searchConfig);
  
  // 如果启用了R2同步，则同步到R2
  if (r2Sync.config.enabled) {
    await r2Sync.syncToR2(searchConfig, 'searchConfig');
  }
  
  // 显示保存成功消息
  alert(chrome.i18n.getMessage("config_saved"));
}

// 打开R2配置对话框
function openR2Config() {
  r2Sync.createConfigDialog(() => {
    // 配置保存后的回调
    if (r2Sync.config.enabled) {
      r2Sync.syncToR2(searchConfig, 'searchConfig');
    }
  });
}

// 添加事件监听器
document.addEventListener('DOMContentLoaded', () => {
  initPage();
  
  document.getElementById('add-item').addEventListener('click', addSearchItem);
  document.getElementById('save-config').addEventListener('click', saveConfig);
  document.getElementById('r2-config').addEventListener('click', openR2Config);
});