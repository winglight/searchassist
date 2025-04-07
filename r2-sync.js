// r2-sync.js

export class R2Sync {
    constructor() {
        this.config = {
            app: '',
            url: '',
            token: '',
            enabled: false
        };
        this.loadConfig();
    }

    // 加载配置
    loadConfig() {
        const stored = localStorage.getItem('r2Config');
        if (stored) {
            this.config = JSON.parse(stored);
        }
    }

    // 保存配置
    saveConfig() {
        localStorage.setItem('r2Config', JSON.stringify(this.config));
    }

    // 更新配置
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
    }

    // 同步数据到R2
    async syncToR2(data, entity = 'todos') {
        if (!this.config.enabled) return;
        
        // 动态加载 JSZip
        const JSZip = window.JSZip;
        
        // Create a zip file
        const zip = new JSZip();
        
        // Add files to zip
        const jsonString = JSON.stringify(data);
        zip.file(entity, jsonString);
        
        // Generate zip content
        const zipContent = await zip.generateAsync({type: "blob"});
        
        try {
            await fetch(`${this.config.url}/${this.config.app}/${entity}.zip`, {
                method: 'PUT',
                headers: {
                    'X-Custom-Auth-Key': `${this.config.token}`
                },
                body: zipContent
            });
        } catch (error) {
            console.error('Upload failed:', error);
        }
    }

    // 从R2加载数据
    async loadFromR2(entity = 'todos') {
        if (!this.config.enabled) return null;
        
        try {
            const response = await fetch(`${this.config.url}/${this.config.app}/${entity}.zip`, {
                headers: {
                    'X-Custom-Auth-Key': `${this.config.token}`
                }
            });
            
            if (!response.ok) return null;
            
            // Get zip file blob
            const zipBlob = await response.blob();
            
            // 动态加载 JSZip
            const JSZip = window.JSZip;
            
            // Load and parse zip
            const zip = new JSZip();
            const contents = await zip.loadAsync(zipBlob);
            
            // Extract files
            const files = [];
            for (let filename in contents.files) {
                const content = await contents.files[filename].async("string");
                files.push({
                    name: filename,
                    content: content
                });
            }
            
            return JSON.parse(files[0].content);
        } catch (error) {
            console.error('Download failed:', error);
            return null;
        }
    }

    // 创建配置对话框
    createConfigDialog(onSave) {
        // 添加样式
        if (!document.getElementById('r2-config-style')) {
            const link = document.createElement('link');
            link.id = 'r2-config-style';
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL('r2-config.css');
            document.head.appendChild(link);
        }

        const configDialog = document.createElement("div");
        configDialog.className = "config-dialog";
        configDialog.innerHTML = `
            <h2>${chrome.i18n.getMessage("r2_config_title")}</h2>
            <label>
                ${chrome.i18n.getMessage("enable_r2_sync")}
                <input type="checkbox" id="r2-enabled" ${this.config.enabled ? 'checked' : ''}>
            </label>
            <label>
                ${chrome.i18n.getMessage("app_name")}
                <input type="text" id="app" value="${this.config.app}">
            </label>
            <label>
                ${chrome.i18n.getMessage("url")}
                <input type="text" id="url" value="${this.config.url}">
            </label>
            <label>
                ${chrome.i18n.getMessage("token")}
                <input type="text" id="token" value="${this.config.token}">
            </label>
            <button id="save-r2-config">${chrome.i18n.getMessage("save_button")}</button>
            <button id="close-config">${chrome.i18n.getMessage("close_button")}</button>
        `;

        document.body.appendChild(configDialog);

        document.getElementById("save-r2-config").addEventListener("click", () => {
            const newConfig = {
                enabled: document.getElementById("r2-enabled").checked,
                app: document.getElementById("app").value,
                url: document.getElementById("url").value,
                token: document.getElementById("token").value,
            };
            this.updateConfig(newConfig);
            if (onSave) onSave();
            configDialog.remove();
            
            // 显示保存成功提示
            alert(chrome.i18n.getMessage("r2_config_saved"));
        });

        document.getElementById("close-config").addEventListener("click", () => {
            configDialog.remove();
        });
    }
}