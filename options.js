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
  
  // 获取保存的语言设置
  chrome.storage.local.get('userLocale', (result) => {
    // 如果没有保存的语言设置，则使用 manifest 中的默认语言
    // manifest.json 中设置了 default_locale: "zh_CN"
    const userLocale = result.userLocale || "zh_CN";
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      // 设置下拉框的值
      languageSelect.value = userLocale;
    }
  });
}

// 初始化页面
async function initPage() {
  // 初始化国际化
  initI18n();
  
  // 先加载本地配置
  await loadLocalConfigurations();
  
  // 异步加载R2配置
  loadR2ConfigurationsAsync();
  
  // 添加语言切换事件
  document.getElementById('language-select').addEventListener('change', function() {
    const newLocale = this.value;
    // 保存用户选择的语言
    chrome.storage.local.set({ 'userLocale': newLocale }, () => {
      // 应用新语言，但不重新加载页面
      applyLanguage(newLocale);
    });
  });
  
  // 渲染搜索项
  renderSearchItems();
}

// 加载本地配置
async function loadLocalConfigurations() {
  // 直接从本地存储加载配置
  searchConfig = await loadSearchConfig();
}

// 异步加载R2配置
async function loadR2ConfigurationsAsync() {
  // 如果R2同步已启用，则尝试从R2加载配置
  if (r2Sync.config.enabled) {
    try {
      const r2Config = await r2Sync.loadFromR2('searchConfig');
      if (r2Config && Array.isArray(r2Config) && r2Config.length > 0) {
        // 更新搜索配置
        searchConfig = r2Config;
        // 保存到本地存储
        await saveSearchConfig(searchConfig);
        // 重新渲染搜索项
        renderSearchItems();
      }
    } catch (error) {
      console.error('Failed to load from R2:', error);
    }
  }
}

// 应用语言
function applyLanguage(locale) {
  // 手动加载对应语言的消息文件
  fetch(chrome.runtime.getURL(`_locales/${locale}/messages.json`))
    .then(response => response.json())
    .then(messages => {
      // 保存当前加载的消息到全局变量，以便在renderSearchItems中使用
      window.currentMessages = messages;
      
      // 更新所有带有 data-i18n 属性的元素的文本
      document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = messages[key]?.message || key;
      });
      
      // 重新渲染搜索项以更新文本
      renderSearchItems();
    })
    .catch(error => {
      console.error('Failed to load language file:', error);
    });
}

// 获取国际化消息
function getMessage(key) {
  // 如果有手动加载的消息，优先使用
  if (window.currentMessages && window.currentMessages[key]) {
    return window.currentMessages[key].message;
  }
  // 否则使用Chrome API
  return chrome.i18n.getMessage(key);
}

// 渲染搜索项
function renderSearchItems() {
  const container = document.getElementById('search-items-container');
  container.innerHTML = '';
  
  if (!searchConfig || !Array.isArray(searchConfig) || searchConfig.length === 0) {
    console.error('Invalid search config:', searchConfig);
    return;
  }
  
  searchConfig.forEach((item, index) => {
    const itemElement = document.createElement('div');
    itemElement.className = 'search-item';
    itemElement.innerHTML = `
      <div class="form-group">
        <label for="id-${index}">${getMessage("id_label")}</label>
        <input type="text" id="id-${index}" value="${item.id}" readonly>
      </div>
      <div class="form-group">
        <label for="title-${index}">${getMessage("title_label")}</label>
        <input type="text" id="title-${index}" value="${item.title}">
      </div>
      <div class="form-group">
        <label for="url-${index}">${getMessage("url_label")}</label>
        <input type="text" id="url-${index}" value="${item.url}">
      </div>
      <button class="delete" data-index="${index}">${getMessage("delete_button")}</button>
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
    title: getMessage("search_taobao").replace(getMessage("search_taobao").includes('淘宝') ? '淘宝' : 'TaoBao', 'Google'),
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
  alert(getMessage("config_saved"));
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