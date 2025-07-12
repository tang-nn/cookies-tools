// 重构后的交互逻辑
import { notification } from "./components/notification/index.js";
import { ACTIONS } from "./constants.js";

class TabManager {
  constructor() {
    this.sourceTabId = null;
    this.targetTabId = null;
    this.notification = notification;
    this.initCurrentTab();
    this.initSelectors();
    this.bindEvents();
  }

  async initCurrentTab() {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.targetTabId = currentTab?.id || null;
  }

  async initSelectors() {
    const tabs = await chrome.tabs.query({});
    this.populateSelector(document.getElementById("tabSourceSelect"), tabs);
    this.populateSelector(document.getElementById("tabTargetSelect"), tabs, this.targetTabId);
  }

  populateSelector(selector, tabs, selectedId = null) {
    if (typeof selector === "string") {
      selector = document.getElementById(selector);
    }
    selector.innerHTML = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "-- Select --";
    selector.appendChild(emptyOption);

    tabs.forEach((tab) => {
      const option = document.createElement("option");
      option.value = tab.id;
      option.textContent = tab.title;
      option.title = tab.url;
      if (selectedId && tab.id === selectedId) {
        option.selected = true;
      }
      selector.appendChild(option);
    });
  }

  bindEvents() {
    // 绑定选择器变化事件
    document.getElementById("tabSourceSelect").addEventListener("change", (e) => {
      this.sourceTabId = e.target.value;
      this.updateUI();
    });

    document.getElementById("tabTargetSelect").addEventListener("change", (e) => {
      this.targetTabId = e.target.value;
      this.updateUI();
    });

    // 绑定按钮点击事件
    document
      .getElementById("copySessionBtn")
      .addEventListener("click", () => this.handleAction({ target: { dataset: { action: ACTIONS.COPY_SESSION } } }));
    document
      .getElementById("copyCookieBtn")
      .addEventListener("click", () => this.handleAction({ target: { dataset: { action: ACTIONS.COPY_COOKIES } } }));
    document
      .getElementById("copyLocalBtn")
      .addEventListener("click", () => this.handleAction({ target: { dataset: { action: ACTIONS.COPY_LOCAL } } }));
    document
      .getElementById("copyAllBtn")
      .addEventListener("click", () => this.handleAction({ target: { dataset: { action: ACTIONS.COPY_ALL } } }));
  }

  updateUI() {
    // 根据选择状态更新UI
    const isValid = this.sourceTabId && this.targetTabId;
    document.querySelectorAll(".action-btn").forEach((btn) => {
      btn.disabled = !isValid;
    });
  }

  async handleAction(e) {
    const action = e.target.dataset.action;
    console.log(`执行操作: ${action}`);
    console.log("this: ", this);

    try {
      const response = await chrome.runtime.sendMessage({
        action,
        sourceTabId: +this.sourceTabId,
        targetTabId: +this.targetTabId,
      });

      if (response?.error) {
        this.notification.show(`操作失败: ${response.error}`, "error");
      } else if (response?.success) {
        this.notification.show(`${action.replace("copy", "复制")}操作成功`, "success");

        // 显示拷贝的数据
        if (response.data) {
          const resultElement = document.getElementById("resultElement");
          resultElement.textContent = JSON.stringify(response.data, null, 2);
        }
      } else {
        this.notification.show(`操作失败: 未知响应格式`, "error");
      }
    } catch (error) {
      this.notification.show(`操作失败: ${error.message}`, "error");
    }
  }
}

// 初始化
new TabManager();
