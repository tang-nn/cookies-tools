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
    this.populateSelector("tabSourceSelect", tabs);
    this.populateSelector("tabTargetSelect", tabs, this.targetTabId);
    this.initCustomSelectors();
  }

  // 创建SVG图标元素
  createLocationIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "location-icon");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "#4285f4");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z");
    svg.appendChild(path);
    
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "10");
    circle.setAttribute("r", "3");
    svg.appendChild(circle);
    
    return svg;
  }

  // 初始化自定义选择器事件
  initCustomSelectors() {
    this.initCustomSelector(document.getElementById('sourceCustomSelect'), 'tabSourceSelect');
    this.initCustomSelector(document.getElementById('targetCustomSelect'), 'tabTargetSelect');
  }

  // 设置单个自定义选择器
  initCustomSelector(customSelect, hiddenInputId) {
    const trigger = customSelect.querySelector('.select-trigger');
    const optionsContainer = customSelect.querySelector('.select-options');
    
    // 点击触发器切换选项显示状态
    trigger.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止冒泡，避免立即被document的click事件关闭
      // 关闭其他打开的选择器
      document.querySelectorAll('.select-options').forEach(container => {
        if (container !== optionsContainer) {
          container.style.display = 'none';
        }
      });
      
      // 切换当前选择器的显示状态
      optionsContainer.style.display = optionsContainer.style.display === 'none' ? 'block' : 'none';
    });
    
    // 点击选项容器本身不关闭
    optionsContainer.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // 点击页面其他地方关闭选择器
    document.addEventListener('click', () => {
      optionsContainer.style.display = 'none';
    });
  }

  // 填充自定义选择器
  populateCustomSelector(customSelect, tabs, selectedId = null, hiddenInputId) {
    const trigger = customSelect.querySelector('.select-trigger');
    const optionsContainer = customSelect.querySelector('.select-options');
    const hiddenInput = document.getElementById(hiddenInputId);
    
    optionsContainer.innerHTML = '';
    
    // 清空触发器内容并设置为flex布局
    trigger.innerHTML = '';
    trigger.style.display = 'flex';
    trigger.style.alignItems = 'center';
    trigger.style.gap = '8px';
    
    // 初始触发器内容
    const initialText = document.createElement('span');
    initialText.textContent = '-- 选择标签页 --';
    trigger.appendChild(initialText);
    
    tabs.forEach((tab) => {
      const option = document.createElement('div');
      option.className = 'select-option';
      option.dataset.value = tab.id;
      
      // 为当前标签添加SVG图标
      const isCurrentTab = tab.id === this.targetTabId;
      if (isCurrentTab) {
        const icon = this.createLocationIcon();
        option.appendChild(icon);
      } else {
        // 添加占位元素以保持对齐
        const placeholder = document.createElement('div');
        placeholder.style.width = '16px';
        option.appendChild(placeholder);
      }
      
      // 添加标签标题
      const titleSpan = document.createElement('span');
      titleSpan.textContent = tab.title;
      option.appendChild(titleSpan);
      
      // 设置title属性
      option.title = tab.url;
      
      // 如果是选中项，设置选中样式
      if (selectedId && tab.id === selectedId) {
        option.classList.add('selected');
        this.updateTriggerDisplay(trigger, isCurrentTab, tab.title);
        hiddenInput.value = tab.id;
      }
      
      // 添加点击事件
      option.addEventListener('click', () => {
        // 移除所有选中样式
        optionsContainer.querySelectorAll('.select-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        
        // 设置当前选中项
        option.classList.add('selected');
        this.updateTriggerDisplay(trigger, isCurrentTab, tab.title);
        hiddenInput.value = tab.id;
        optionsContainer.style.display = 'none';
        
        // 触发隐藏输入框的change事件
        hiddenInput.dispatchEvent(new Event('change'));
      });
      
      optionsContainer.appendChild(option);
    });
  }
  
  // 更新触发器显示内容，使用SVG图标
  updateTriggerDisplay(trigger, isCurrentTab, title) {
    trigger.innerHTML = '';
    trigger.style.display = 'flex';
    trigger.style.alignItems = 'center';
    trigger.style.gap = '8px';
    
    // 如果是当前标签，添加SVG图标
    if (isCurrentTab) {
      const icon = this.createLocationIcon();
      trigger.appendChild(icon);
    } else {
      // 添加占位元素以保持对齐
      const placeholder = document.createElement('div');
      placeholder.style.width = '16px';
      trigger.appendChild(placeholder);
    }
    
    // 添加标题文本
    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    trigger.appendChild(titleSpan);
  }

  // 更新后的populateSelector方法，适配自定义选择器
  populateSelector(selectorId, tabs, selectedId = null) {
    // 处理原始select元素（虽然隐藏了，但保持兼容性）
    const originalSelect = document.getElementById(selectorId);
    originalSelect.innerHTML = '';
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "-- Select --";
    originalSelect.appendChild(emptyOption);

    tabs.forEach((tab) => {
      const option = document.createElement("option");
      option.value = tab.id;
      option.textContent = tab.title;
      option.title = tab.url;
      if (selectedId && tab.id === selectedId) {
        option.selected = true;
      }
      originalSelect.appendChild(option);
    });
    
    // 处理自定义选择器
    const customSelectId = selectorId === 'tabSourceSelect' ? 'sourceCustomSelect' : 'targetCustomSelect';
    const customSelect = document.getElementById(customSelectId);
    if (customSelect) {
      this.populateCustomSelector(customSelect, tabs, selectedId, selectorId);
    }
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

    // 添加双击result-container复制内容到剪贴板的功能
    document.querySelector(".result-container").addEventListener("dblclick", () => {
      const resultElement = document.getElementById("resultElement");
      const text = resultElement.textContent;

      if (text) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            this.notification.show("内容已复制到剪贴板", "success");
          })
          .catch((err) => {
            this.notification.show(`复制失败: ${err.message}`, "error");
          });
      } else {
        this.notification.show("没有内容可复制", "error");
      }
    });
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
