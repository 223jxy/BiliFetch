// ==UserScript==
// @name         BiliFetch - B站下载助手
// @namespace    https://bilifetch.local/scriptcat
// @version      2.3.0
// @description  单脚本版：自动识别全部分P，用户自行勾选视频，默认最高可用清晰度并自动合并音视频
// @author       BiliFetch
// @license      MIT
// @homepageURL   https://scriptcat.org/
// @supportURL    https://scriptcat.org/
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/list/*
// @require      https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js
// @require      https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @connect      api.bilibili.com
// @connect      comment.bilibili.com
// @connect      *.hdslb.com
// @connect      *.bilivideo.com
// @connect      unpkg.com
// @connect      cdn.jsdelivr.net
// @connect      127.0.0.1
// @connect      localhost
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const pageWindow = window;
  const SCRIPT_VERSION = "2.3.0";
  const PANEL_ID = "bilifetch-scriptcat-panel";
  const STATUS_ID = "bilifetch-scriptcat-status";
  const MODE_ID = "bilifetch-scriptcat-mode";
  const PAGE_LIST_ID = "bilifetch-scriptcat-pages";
  const QUALITY_ID = "bilifetch-scriptcat-quality";
  const PROGRESS_ID = "bilifetch-scriptcat-progress";
  const PROGRESS_TEXT_ID = "bilifetch-scriptcat-progress-text";
  const STORAGE_MODE_KEY = "bilifetch-scriptcat-selected-modes-v2";
  const STORAGE_PAGE_KEY = "bilifetch-scriptcat-selected-pages-v1";
  const STORAGE_QUALITY_KEY = "bilifetch-scriptcat-quality";
  const STORAGE_SETTINGS_KEY = "bilifetch-scriptcat-settings-v1";
  const STORAGE_SEEN_VERSION_KEY = "bilifetch-scriptcat-seen-version";
  const STORAGE_PANEL_POSITION_KEY = "bilifetch-scriptcat-panel-position-v1";
  const LOCAL_HELPER_URL = "http://127.0.0.1:18991";
  const DEFAULT_SELECTED_MODES = ["merge"];
  const DEFAULT_SETTINGS = {
    mergeWarnMB: 900,
    showChangelog: true,
    saveCommandsOnMergeFail: false,
    detailedErrorTips: true,
    language: "zh",
    autoSaveBat: false,
    allowBrowserMerge: true,
    useLocalHelper: true,
  };
  const FFMPEG_CORE_BASES = [
    "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd",
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd",
  ];

  const modes = [
    ["merge", "合并视频+音频MP4"],
    ["video", "只下载视频流"],
    ["audio", "只下载音频"],
    ["subtitles", "只下载字幕"],
    ["danmaku", "只下载弹幕"],
    ["cover", "只下载封面"],
    ["info", "只下载信息JSON"],
    ["commands", "导出合并命令"],
    ["copy", "复制直链和信息"],
  ];

  const qualities = [
    ["best", "最高可用"],
    ["2160", "4K / 2160P"],
    ["1440", "2K / 1440P"],
    ["1080", "1080P"],
    ["720", "720P"],
    ["480", "480P"],
    ["360", "360P"],
  ];

  const UI_TEXT = {
    zh: {
      title: "BiliFetch 下载助手",
      subtitle: "本地助手、下载、合并、诊断",
      note: "<strong>全自动提示</strong>：先双击“启动BiliFetch本地助手.bat”并保持窗口打开；未启动时会尝试浏览器内自动合并，不再下载 bat。",
      modeLabel: "下载内容（可多选）",
      videoLabel: "选择视频",
      qualityLabel: "清晰度",
      selectAll: "全选",
      selectCurrent: "只选当前",
      videosLoading: "正在识别页面视频...",
      preview: "预览清单",
      start: "开始",
      diagnose: "复制诊断",
      settings: "设置",
      more: "更多",
      less: "收起",
      ready: "准备好了",
      statusReady: "默认已勾选“合并视频+音频MP4”。脚本会识别所有视频，勾选要下载的视频后点“开始”。",
      languageLabel: "界面语言",
      modes: {
        merge: "合并视频+音频MP4",
        video: "只下载视频流",
        audio: "只下载音频",
        subtitles: "只下载字幕",
        danmaku: "只下载弹幕",
        cover: "只下载封面",
        info: "只下载信息JSON",
        commands: "导出合并命令",
        copy: "复制直链和信息",
      },
      qualities: {
        best: "最高可用",
        2160: "4K / 2160P",
        1440: "2K / 1440P",
        1080: "1080P",
        720: "720P",
        480: "480P",
        360: "360P",
      },
    },
    en: {
      title: "BiliFetch Helper",
      subtitle: "Local helper, download, merge, diagnostics",
      note: "<strong>Automation tip</strong>: start the BiliFetch Local Helper first. If it is not running, the script tries browser-side merging and will not download a bat file.",
      modeLabel: "Content (multi-select)",
      videoLabel: "Videos",
      qualityLabel: "Quality",
      selectAll: "All",
      selectCurrent: "Current",
      videosLoading: "Detecting page videos...",
      preview: "Preview",
      start: "Start",
      diagnose: "Copy Diagnostics",
      settings: "Settings",
      more: "More",
      less: "Less",
      ready: "Ready",
      statusReady: "Merge video + audio MP4 is selected by default. Select videos to download, then click Start.",
      languageLabel: "Language",
      modes: {
        merge: "Merge video + audio MP4",
        video: "Video stream only",
        audio: "Audio only",
        subtitles: "Subtitles only",
        danmaku: "Danmaku only",
        cover: "Cover only",
        info: "Info JSON only",
        commands: "Export merge commands",
        copy: "Copy links and info",
      },
      qualities: {
        best: "Best available",
        2160: "4K / 2160P",
        1440: "2K / 1440P",
        1080: "1080P",
        720: "720P",
        480: "480P",
        360: "360P",
      },
    },
  };

  let running = false;
  let ffmpegInstance = null;
  let ffmpegLoaded = false;
  let lastError = null;
  let lastDiagnostics = [];
  let lastDetectedBase = null;

  function installPanel() {
    if (document.getElementById(PANEL_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483647;
        width: min(390px, calc(100vw - 28px));
        box-sizing: border-box;
        font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #172033;
        background: #ffffff;
        border: 1px solid rgba(23, 32, 51, 0.16);
        border-radius: 8px;
        box-shadow: 0 14px 42px rgba(20, 28, 44, 0.22);
        overflow: hidden;
      }
      #${PANEL_ID}.is-collapsed {
        width: auto;
      }
      #${PANEL_ID} * {
        box-sizing: border-box;
      }
      #${PANEL_ID} .bf-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        color: #ffffff;
        background: #00a1d6;
        cursor: move;
        user-select: none;
        touch-action: none;
      }
      #${PANEL_ID}.is-dragging {
        transition: none;
      }
      #${PANEL_ID} .bf-title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 750;
      }
      #${PANEL_ID} .bf-subtitle {
        display: block;
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 11px;
        font-weight: 500;
        opacity: 0.9;
      }
      #${PANEL_ID} .bf-toggle {
        width: 30px;
        height: 30px;
        border: 0;
        border-radius: 6px;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.18);
        cursor: pointer;
        font-weight: 800;
      }
      #${PANEL_ID} .bf-body {
        display: grid;
        gap: 10px;
        padding: 12px;
      }
      #${PANEL_ID}.is-collapsed .bf-body {
        display: none;
      }
      #${PANEL_ID} .bf-note {
        color: #5a6478;
      }
      #${PANEL_ID} .bf-note strong {
        color: #d35400;
      }
      #${PANEL_ID} .bf-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 132px;
        gap: 8px;
      }
      #${PANEL_ID} .bf-side {
        display: grid;
        gap: 8px;
        align-content: start;
      }
      #${PANEL_ID} .bf-row {
        display: grid;
        gap: 6px;
      }
      #${PANEL_ID} .bf-row-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      #${PANEL_ID} .bf-mini-actions {
        display: flex;
        gap: 6px;
      }
      #${PANEL_ID} .bf-mini-actions button {
        min-height: 26px;
        padding: 3px 8px;
        font-size: 12px;
      }
      #${PANEL_ID} label {
        font-weight: 680;
      }
      #${PANEL_ID} select,
      #${PANEL_ID} button {
        min-height: 34px;
        border-radius: 6px;
        border: 1px solid rgba(23, 32, 51, 0.18);
        background: #ffffff;
        color: #172033;
        font: inherit;
      }
      #${PANEL_ID} select {
        width: 100%;
        padding: 6px 8px;
      }
      #${PANEL_ID} .bf-mode-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
      }
      #${PANEL_ID} .bf-mode-item {
        display: flex;
        align-items: center;
        min-height: 32px;
        gap: 7px;
        padding: 6px 8px;
        border: 1px solid rgba(23, 32, 51, 0.14);
        border-radius: 6px;
        background: #ffffff;
        font-weight: 520;
        cursor: pointer;
      }
      #${PANEL_ID} .bf-mode-item input {
        flex: 0 0 auto;
      }
      #${PANEL_ID} .bf-mode-item span {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      #${PANEL_ID} .bf-video-list {
        display: grid;
        gap: 6px;
        max-height: 150px;
        overflow: auto;
        padding: 6px;
        border: 1px solid rgba(23, 32, 51, 0.12);
        border-radius: 6px;
        background: #f8fafc;
      }
      #${PANEL_ID} .bf-video-placeholder {
        color: #5a6478;
        font-size: 12px;
      }
      #${PANEL_ID} .bf-video-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 8px;
        align-items: start;
        padding: 7px 8px;
        border: 1px solid rgba(23, 32, 51, 0.12);
        border-radius: 6px;
        background: #ffffff;
        cursor: pointer;
        font-weight: 520;
      }
      #${PANEL_ID} .bf-video-item input {
        margin-top: 2px;
      }
      #${PANEL_ID} .bf-video-title {
        display: block;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      #${PANEL_ID} .bf-video-meta {
        display: block;
        margin-top: 2px;
        color: #6b7280;
        font-size: 11px;
        font-weight: 500;
      }
      #${PANEL_ID} .bf-actions {
        display: grid;
        grid-template-columns: 1.3fr 1fr;
        gap: 8px;
      }
      #${PANEL_ID} .bf-extra-actions {
        display: none;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
      }
      #${PANEL_ID} .bf-extra-actions.is-open {
        display: grid;
      }
      #${PANEL_ID} .bf-primary {
        border-color: #00a1d6;
        color: #ffffff;
        background: #00a1d6;
        cursor: pointer;
        font-weight: 750;
      }
      #${PANEL_ID} .bf-secondary {
        cursor: pointer;
      }
      #${PANEL_ID} button:disabled,
      #${PANEL_ID} select:disabled,
      #${PANEL_ID} input:disabled {
        cursor: wait;
        opacity: 0.68;
      }
      #${PANEL_ID} .bf-progress-wrap {
        display: grid;
        gap: 4px;
      }
      #${PANEL_ID} .bf-progress-track {
        height: 8px;
        overflow: hidden;
        border-radius: 999px;
        background: #edf1f7;
      }
      #${PROGRESS_ID} {
        width: 0%;
        height: 100%;
        background: #00a1d6;
        transition: width 0.18s ease;
      }
      #${PROGRESS_TEXT_ID} {
        min-height: 18px;
        color: #5a6478;
        font-size: 12px;
      }
      #${STATUS_ID} {
        min-height: 108px;
        max-height: 220px;
        margin: 0;
        padding: 8px;
        overflow: auto;
        color: #263248;
        background: #f5f7fb;
        border: 1px solid rgba(23, 32, 51, 0.1);
        border-radius: 6px;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .bilifetch-settings-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(17, 24, 39, 0.42);
      }
      .bilifetch-settings-dialog {
        width: min(460px, 100%);
        color: #172033;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 18px 52px rgba(20, 28, 44, 0.28);
        overflow: hidden;
        font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .bilifetch-settings-dialog h2 {
        margin: 0;
        padding: 13px 14px;
        color: #ffffff;
        background: #00a1d6;
        font-size: 16px;
      }
      .bilifetch-settings-dialog .bf-settings-body {
        display: grid;
        gap: 12px;
        padding: 14px;
      }
      .bilifetch-settings-dialog label {
        display: grid;
        gap: 5px;
      }
      .bilifetch-settings-dialog input[type="number"] {
        min-height: 34px;
        padding: 6px 8px;
        border: 1px solid rgba(23, 32, 51, 0.18);
        border-radius: 6px;
      }
      .bilifetch-settings-dialog .bf-check {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .bilifetch-settings-dialog .bf-settings-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .bilifetch-settings-dialog button {
        min-height: 34px;
        border-radius: 6px;
        border: 1px solid rgba(23, 32, 51, 0.18);
        background: #ffffff;
        cursor: pointer;
      }
      .bilifetch-settings-dialog .bf-save {
        color: #ffffff;
        border-color: #00a1d6;
        background: #00a1d6;
        font-weight: 700;
      }
      @media (max-width: 520px) {
        #${PANEL_ID} {
          right: 10px;
          bottom: 10px;
          width: calc(100vw - 20px);
        }
        #${PANEL_ID} .bf-grid,
        #${PANEL_ID} .bf-actions,
        #${PANEL_ID} .bf-mode-list {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.documentElement.appendChild(style);

    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="bf-head">
        <div class="bf-title">BiliFetch 下载助手<span class="bf-subtitle">本地助手、下载、合并、诊断</span></div>
        <button class="bf-toggle" type="button" title="收起或展开">-</button>
      </div>
      <div class="bf-body">
        <div class="bf-note"><strong>全自动提示</strong>：先双击“启动BiliFetch本地助手.bat”并保持窗口打开；未启动时会尝试浏览器内自动合并，不再下载 bat。</div>
        <div class="bf-grid">
          <div class="bf-row">
            <label for="${MODE_ID}">下载内容（可多选）</label>
            <div id="${MODE_ID}" class="bf-mode-list" role="group" aria-label="下载内容"></div>
          </div>
          <div class="bf-side">
            <div class="bf-row">
              <label for="${QUALITY_ID}">清晰度</label>
              <select id="${QUALITY_ID}"></select>
            </div>
          </div>
        </div>
        <div class="bf-row">
          <div class="bf-row-head">
            <label data-bf-video-label for="${PAGE_LIST_ID}">选择视频</label>
            <div class="bf-mini-actions">
              <button class="bf-secondary" id="bilifetch-scriptcat-select-all" type="button">全选</button>
              <button class="bf-secondary" id="bilifetch-scriptcat-select-current" type="button">只选当前</button>
            </div>
          </div>
          <div id="${PAGE_LIST_ID}" class="bf-video-list" role="group" aria-label="选择视频">
            <span class="bf-video-placeholder">正在识别页面视频...</span>
          </div>
        </div>
        <div class="bf-actions">
          <button class="bf-primary" id="bilifetch-scriptcat-start" type="button">开始</button>
          <button class="bf-secondary" id="bilifetch-scriptcat-more" type="button">更多</button>
        </div>
        <div class="bf-extra-actions" id="bilifetch-scriptcat-extra-actions">
          <button class="bf-secondary" id="bilifetch-scriptcat-preview" type="button">预览清单</button>
          <button class="bf-secondary" id="bilifetch-scriptcat-diagnose" type="button">复制诊断</button>
          <button class="bf-secondary" id="bilifetch-scriptcat-settings" type="button">设置</button>
        </div>
        <div class="bf-progress-wrap">
          <div class="bf-progress-track"><div id="${PROGRESS_ID}"></div></div>
          <div id="${PROGRESS_TEXT_ID}">准备好了</div>
        </div>
        <pre id="${STATUS_ID}">默认已勾选“合并视频+音频MP4”。需要字幕、封面、信息等内容时，可继续多选后点“开始”。</pre>
      </div>
    `;
    document.documentElement.appendChild(panel);
    restorePanelPosition(panel);
    enablePanelDrag(panel);

    fillModeChecks(panel.querySelector(`#${MODE_ID}`), modes, loadSelectedModes());
    fillSelect(panel.querySelector(`#${QUALITY_ID}`), qualities, loadSelectedQuality());

    panel.querySelector(`#${MODE_ID}`).addEventListener("change", (event) => {
      handleModeChecksChange(panel.querySelector(`#${MODE_ID}`), event);
    });
    panel.querySelector(`#${QUALITY_ID}`).addEventListener("change", (event) => {
      localStorage.setItem(STORAGE_QUALITY_KEY, normalizeQuality(event.target.value));
      refreshDetectedVideoHint();
    });
    panel.querySelector(`#${PAGE_LIST_ID}`).addEventListener("change", (event) => {
      handleVideoChecksChange(event);
    });
    panel.querySelector("#bilifetch-scriptcat-select-all").addEventListener("click", () => {
      selectVideoChoices("all");
    });
    panel.querySelector("#bilifetch-scriptcat-select-current").addEventListener("click", () => {
      selectVideoChoices("current");
    });
    panel.querySelector(".bf-toggle").addEventListener("click", () => {
      panel.classList.toggle("is-collapsed");
      panel.querySelector(".bf-toggle").textContent = panel.classList.contains("is-collapsed") ? "+" : "-";
    });
    panel.querySelector("#bilifetch-scriptcat-more").addEventListener("click", () => {
      const extra = panel.querySelector("#bilifetch-scriptcat-extra-actions");
      const text = UI_TEXT[currentLanguage()];
      extra.classList.toggle("is-open");
      panel.querySelector("#bilifetch-scriptcat-more").textContent = extra.classList.contains("is-open") ? text.less : text.more;
    });
    panel.querySelector("#bilifetch-scriptcat-preview").addEventListener("click", () => {
      previewSelectedMode().catch(showError);
    });
    panel.querySelector("#bilifetch-scriptcat-start").addEventListener("click", () => {
      runSelectedMode().catch(showError);
    });
    panel.querySelector("#bilifetch-scriptcat-diagnose").addEventListener("click", () => {
      copyDiagnostics().catch(showError);
    });
    panel.querySelector("#bilifetch-scriptcat-settings").addEventListener("click", () => {
      openSettingsPanel();
    });
    applyLanguage(panel);
    refreshVideoChoices().catch((error) => {
      showVideoChoicesError(error);
    });
    refreshDetectedVideoHint(true);
    showChangelogIfNeeded();
  }

  function enablePanelDrag(panel) {
    const handle = panel.querySelector(".bf-head");
    if (!handle || typeof PointerEvent === "undefined") {
      return;
    }

    let drag = null;
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }
      if (event.target.closest("button, input, select, textarea, a")) {
        return;
      }
      const rect = panel.getBoundingClientRect();
      drag = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
      panel.classList.add("is-dragging");
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    handle.addEventListener("pointermove", (event) => {
      if (!drag || drag.id !== event.pointerId) {
        return;
      }
      const left = clampPanelValue(drag.left + event.clientX - drag.startX, 8, window.innerWidth - drag.width - 8);
      const top = clampPanelValue(drag.top + event.clientY - drag.startY, 8, window.innerHeight - Math.min(drag.height, window.innerHeight - 16) - 8);
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      event.preventDefault();
    });

    const finishDrag = (event) => {
      if (!drag || drag.id !== event.pointerId) {
        return;
      }
      try {
        handle.releasePointerCapture(event.pointerId);
      } catch (error) {
      }
      drag = null;
      panel.classList.remove("is-dragging");
      keepPanelInViewport(panel);
      savePanelPosition(panel);
    };

    handle.addEventListener("pointerup", finishDrag);
    handle.addEventListener("pointercancel", finishDrag);
    window.addEventListener("resize", () => {
      keepPanelInViewport(panel);
      savePanelPosition(panel);
    });
  }

  function restorePanelPosition(panel) {
    try {
      const raw = localStorage.getItem(STORAGE_PANEL_POSITION_KEY);
      if (!raw) {
        return;
      }
      const position = JSON.parse(raw);
      if (!Number.isFinite(position.left) || !Number.isFinite(position.top)) {
        return;
      }
      panel.style.left = `${position.left}px`;
      panel.style.top = `${position.top}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      requestAnimationFrame(() => {
        keepPanelInViewport(panel);
        savePanelPosition(panel);
      });
    } catch (error) {
      localStorage.removeItem(STORAGE_PANEL_POSITION_KEY);
    }
  }

  function keepPanelInViewport(panel) {
    const rect = panel.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - Math.min(rect.height, window.innerHeight - 16) - 8);
    const left = clampPanelValue(rect.left, 8, maxLeft);
    const top = clampPanelValue(rect.top, 8, maxTop);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function savePanelPosition(panel) {
    const rect = panel.getBoundingClientRect();
    if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top)) {
      return;
    }
    localStorage.setItem(STORAGE_PANEL_POSITION_KEY, JSON.stringify({
      left: Math.round(rect.left),
      top: Math.round(rect.top),
    }));
  }

  function clampPanelValue(value, min, max) {
    if (max < min) {
      return min;
    }
    return Math.max(min, Math.min(max, value));
  }

  function fillSelect(select, items, selectedValue) {
    for (const [value, label] of items) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = value === selectedValue;
      select.appendChild(option);
    }
  }

  function fillModeChecks(container, items, selectedValues) {
    if (!container) {
      return;
    }
    const selected = new Set(normalizeSelectedModes(selectedValues));
    container.innerHTML = "";
    for (const [value, label] of items) {
      const option = document.createElement("label");
      option.className = "bf-mode-item";
      option.innerHTML = `
        <input class="bf-mode-check" type="checkbox" value="${escapeHtml(value)}" ${selected.has(value) ? "checked" : ""}>
        <span data-mode-label="${escapeHtml(value)}">${escapeHtml(label)}</span>
      `;
      container.appendChild(option);
    }
  }

  function selectedModes() {
    const container = document.getElementById(MODE_ID);
    const values = getCheckedModes(container);
    return values.length ? values : DEFAULT_SELECTED_MODES.slice();
  }

  function selectedMode() {
    return selectedModes()[0] || "merge";
  }

  function getCheckedModes(container = document.getElementById(MODE_ID)) {
    if (!container) {
      return [];
    }
    return normalizeSelectedModes(Array.from(container.querySelectorAll(".bf-mode-check:checked")).map((input) => input.value), false);
  }

  function loadSelectedModes() {
    const raw = localStorage.getItem(STORAGE_MODE_KEY);
    if (!raw) {
      return DEFAULT_SELECTED_MODES.slice();
    }
    try {
      const parsed = JSON.parse(raw);
      return normalizeSelectedModes(Array.isArray(parsed) ? parsed : [parsed]);
    } catch (error) {
      return normalizeSelectedModes([raw]);
    }
  }

  function saveSelectedModes(values) {
    localStorage.setItem(STORAGE_MODE_KEY, JSON.stringify(normalizeSelectedModes(values)));
  }

  function normalizeSelectedModes(values, fallback = true) {
    const allowed = new Set(modes.map(([value]) => value));
    const result = [];
    (Array.isArray(values) ? values : []).forEach((value) => {
      if (allowed.has(value) && !result.includes(value)) {
        result.push(value);
      }
    });
    return result.length || !fallback ? result : DEFAULT_SELECTED_MODES.slice();
  }

  function handleModeChecksChange(container, event) {
    let checked = getCheckedModes(container);
    if (!checked.length && event && event.target) {
      event.target.checked = true;
      checked = getCheckedModes(container);
    }
    saveSelectedModes(checked);
  }

  function getVideoPages(view) {
    const pages = Array.isArray(view && view.pages) && view.pages.length
      ? view.pages
      : [{ cid: view && view.cid, page: 1, part: (view && view.title) || "video" }];
    return pages.filter((page) => page && page.cid);
  }

  function pageChoiceKey(page, index) {
    return String((page && page.cid) || `${(page && page.page) || index + 1}`);
  }

  function pageChoiceTitle(page, index) {
    const pageNo = Number(page && page.page) || index + 1;
    const part = String((page && page.part) || "").trim();
    return `P${pageNo} ${part || "未命名"}`.trim();
  }

  function currentPageChoiceKey(view) {
    const pages = getVideoPages(view);
    const current = pickVideoPage(view);
    const index = pages.findIndex((page) => String(page.cid) === String(current && current.cid));
    if (index >= 0) {
      return pageChoiceKey(pages[index], index);
    }
    return pages.length ? pageChoiceKey(pages[0], 0) : "";
  }

  function loadStoredPageKeys(bvid) {
    try {
      const raw = localStorage.getItem(STORAGE_PAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (parsed && parsed.bvid === bvid && Array.isArray(parsed.keys)) {
        return parsed.keys.map(String);
      }
    } catch (error) {
      console.warn("[BiliFetch] page selection load failed", error);
    }
    return [];
  }

  function saveSelectedPageKeys(bvid, keys) {
    if (!bvid) {
      return;
    }
    localStorage.setItem(STORAGE_PAGE_KEY, JSON.stringify({
      bvid,
      keys: Array.from(new Set((keys || []).map(String))),
    }));
  }

  function getCheckedPageKeys(container = document.getElementById(PAGE_LIST_ID)) {
    if (!container) {
      return [];
    }
    return Array.from(container.querySelectorAll(".bf-video-check:checked")).map((input) => input.value);
  }

  function renderVideoChoices(base, options = {}) {
    const container = document.getElementById(PAGE_LIST_ID);
    if (!container || !base || !base.view) {
      return;
    }
    lastDetectedBase = base;
    const pages = getVideoPages(base.view);
    const allowed = new Set(pages.map((page, index) => pageChoiceKey(page, index)));
    let selectedKeys = options.preserve ? getCheckedPageKeys(container) : [];
    if (!selectedKeys.length) {
      selectedKeys = loadStoredPageKeys(base.bvid);
    }
    selectedKeys = selectedKeys.filter((key) => allowed.has(key));
    if (!selectedKeys.length) {
      const currentKey = currentPageChoiceKey(base.view);
      selectedKeys = currentKey ? [currentKey] : [];
    }

    container.dataset.bvid = base.bvid || "";
    container.dataset.currentKey = currentPageChoiceKey(base.view);
    container.innerHTML = "";

    if (!pages.length) {
      container.innerHTML = `<span class="bf-video-placeholder">没有识别到可下载的视频。</span>`;
      return;
    }

    pages.forEach((page, index) => {
      const key = pageChoiceKey(page, index);
      const item = document.createElement("label");
      item.className = "bf-video-item";
      item.innerHTML = `
        <input class="bf-video-check" type="checkbox" value="${escapeHtml(key)}" ${selectedKeys.includes(key) ? "checked" : ""}>
        <span>
          <span class="bf-video-title">${escapeHtml(pageChoiceTitle(page, index))}</span>
          <span class="bf-video-meta">CID ${escapeHtml(String(page.cid || ""))}</span>
        </span>
      `;
      container.appendChild(item);
    });
    saveSelectedPageKeys(base.bvid, getCheckedPageKeys(container));
  }

  function handleVideoChecksChange(event) {
    const container = document.getElementById(PAGE_LIST_ID);
    if (!container) {
      return;
    }
    let checked = getCheckedPageKeys(container);
    if (!checked.length && event && event.target) {
      event.target.checked = true;
      checked = getCheckedPageKeys(container);
      appendStatus("至少要选择一个视频。");
    }
    saveSelectedPageKeys(container.dataset.bvid || safeCall(getBvid), checked);
    refreshDetectedVideoHint();
  }

  function selectVideoChoices(mode) {
    const container = document.getElementById(PAGE_LIST_ID);
    if (!container) {
      return;
    }
    const checks = Array.from(container.querySelectorAll(".bf-video-check"));
    if (!checks.length) {
      return;
    }
    if (mode === "current") {
      const currentKey = container.dataset.currentKey || checks[0].value;
      checks.forEach((input) => {
        input.checked = input.value === currentKey;
      });
    } else {
      checks.forEach((input) => {
        input.checked = true;
      });
    }
    saveSelectedPageKeys(container.dataset.bvid || safeCall(getBvid), getCheckedPageKeys(container));
    refreshDetectedVideoHint();
  }

  function selectedTargetPages(view) {
    const pages = getVideoPages(view);
    const selected = new Set(getCheckedPageKeys());
    if (!selected.size) {
      const current = currentPageChoiceKey(view);
      if (current) {
        selected.add(current);
      }
    }
    const result = pages.filter((page, index) => selected.has(pageChoiceKey(page, index)));
    if (!result.length) {
      throw new Error("请先在“选择视频”里勾选至少一个视频。");
    }
    return result;
  }

  async function refreshVideoChoices() {
    const container = document.getElementById(PAGE_LIST_ID);
    if (container) {
      const text = UI_TEXT[currentLanguage()];
      container.innerHTML = `<span class="bf-video-placeholder">${escapeHtml(text.videosLoading)}</span>`;
    }
    const base = await fetchBaseInfo();
    renderVideoChoices(base);
    refreshDetectedVideoHint();
  }

  function showVideoChoicesError(error) {
    const container = document.getElementById(PAGE_LIST_ID);
    if (container) {
      container.innerHTML = `<span class="bf-video-placeholder">视频识别失败：${escapeHtml(error.message)}</span>`;
    }
  }

  function selectedQuality() {
    const select = document.getElementById(QUALITY_ID);
    return normalizeQuality(select ? select.value : localStorage.getItem(STORAGE_QUALITY_KEY));
  }

  function loadSelectedQuality() {
    return normalizeQuality(localStorage.getItem(STORAGE_QUALITY_KEY));
  }

  function normalizeQuality(value) {
    return qualities.some(([quality]) => quality === value) ? value : "best";
  }

  function qualityDisplayLabel(value = selectedQuality()) {
    const labels = UI_TEXT[currentLanguage()].qualities || {};
    return labels[value] || labelOf(qualities, value);
  }

  function selectedQualityMaxHeight() {
    const value = selectedQuality();
    if (value === "best") {
      return Infinity;
    }
    const height = Number(value);
    return Number.isFinite(height) && height > 0 ? height : Infinity;
  }

  function selectedQualityQn() {
    const map = {
      best: "127",
      2160: "120",
      1440: "112",
      1080: "80",
      720: "64",
      480: "32",
      360: "16",
    };
    return map[selectedQuality()] || map.best;
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (!raw) {
        return Object.assign({}, DEFAULT_SETTINGS);
      }
      return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
    } catch (error) {
      console.warn("[BiliFetch] settings load failed", error);
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(Object.assign({}, DEFAULT_SETTINGS, settings)));
  }

  function currentLanguage() {
    return loadSettings().language === "en" ? "en" : "zh";
  }

  function applyLanguage(panel = document.getElementById(PANEL_ID)) {
    if (!panel) {
      return;
    }
    const text = UI_TEXT[currentLanguage()];
    const title = panel.querySelector(".bf-title");
    if (title) {
      title.innerHTML = `${text.title}<span class="bf-subtitle">${text.subtitle}</span>`;
    }
    const note = panel.querySelector(".bf-note");
    if (note) {
      note.innerHTML = text.note;
    }
    const modeLabel = panel.querySelector(`label[for="${MODE_ID}"]`);
    if (modeLabel) {
      modeLabel.textContent = text.modeLabel;
    }
    const videoLabel = panel.querySelector("[data-bf-video-label]");
    if (videoLabel) {
      videoLabel.textContent = text.videoLabel;
    }
    const qualityLabel = panel.querySelector(`label[for="${QUALITY_ID}"]`);
    if (qualityLabel) {
      qualityLabel.textContent = text.qualityLabel;
    }
    setButtonText(panel, "#bilifetch-scriptcat-preview", text.preview);
    setButtonText(panel, "#bilifetch-scriptcat-start", text.start);
    setButtonText(panel, "#bilifetch-scriptcat-diagnose", text.diagnose);
    setButtonText(panel, "#bilifetch-scriptcat-settings", text.settings);
    setButtonText(panel, "#bilifetch-scriptcat-select-all", text.selectAll);
    setButtonText(panel, "#bilifetch-scriptcat-select-current", text.selectCurrent);
    const moreButton = panel.querySelector("#bilifetch-scriptcat-more");
    const extraActions = panel.querySelector("#bilifetch-scriptcat-extra-actions");
    if (moreButton && extraActions) {
      moreButton.textContent = extraActions.classList.contains("is-open") ? text.less : text.more;
    }
    updateModeLabels(panel.querySelector(`#${MODE_ID}`), text.modes);
    updateSelectLabels(panel.querySelector(`#${QUALITY_ID}`), text.qualities);
    const progressText = panel.querySelector(`#${PROGRESS_TEXT_ID}`);
    if (progressText && ["准备好了", "Ready"].includes(progressText.textContent.trim())) {
      progressText.textContent = text.ready;
    }
    const status = panel.querySelector(`#${STATUS_ID}`);
    if (status && ["打开 B 站视频页后选择下载内容，再点“预览清单”或“开始”。", "默认直接点“开始”。想全自动请先运行本地助手；没运行也会尝试浏览器内合并。", "默认已勾选“合并视频+音频MP4”。脚本会识别所有视频，勾选要下载的视频后点“开始”。", "Open a Bilibili video page, choose content, then click Preview or Start.", "Click Start by default. For full automation, start the local helper first; otherwise browser-side merging is tried.", "Merge video + audio MP4 is selected by default. Select videos to download, then click Start."].includes(status.textContent.trim())) {
      status.textContent = text.statusReady;
    }
  }

  function refreshDetectedVideoHint(force = false) {
    const status = document.getElementById(STATUS_ID);
    if (!status) {
      return;
    }
    const current = status.textContent.trim();
    const readyMessages = [
      UI_TEXT.zh.statusReady,
      UI_TEXT.en.statusReady,
      "默认已勾选“合并视频+音频MP4”。需要字幕、封面、信息等内容时，可继续多选后点“开始”。",
      "Merge video + audio MP4 is selected by default. Select more items if needed, then click Start.",
    ];
    const canReplace = force || readyMessages.includes(current) || current.startsWith("已自动识别页面视频") || current.startsWith("Detected page video");
    if (!canReplace) {
      return;
    }

    try {
      const bvid = getBvid();
      const state = getInitialState();
      const videoData = state.videoData || state.videoInfo || state.view || {};
      const heading = document.querySelector("h1");
      const rawTitle = videoData.title || (heading && heading.textContent) || document.title || bvid;
      const title = String(rawTitle).replace(/_哔哩哔哩.*$/, "").replace(/\s+/g, " ").trim();
      const detectedCount = lastDetectedBase ? getVideoPages(lastDetectedBase.view).length : 0;
      const selectedCount = getCheckedPageKeys().length || (detectedCount ? 1 : 0);
      if (currentLanguage() === "en") {
        setStatus([
          "Detected page video",
          `Title: ${title || bvid}`,
          `BVID: ${bvid}`,
          detectedCount ? `Videos: ${detectedCount}, selected: ${selectedCount}` : "",
          `Default: merge video + audio MP4, ${qualityDisplayLabel()}.`,
          "Select more content if you also need subtitles, cover, info, or danmaku.",
        ].filter(Boolean).join("\n"));
        return;
      }
      setStatus([
        "已自动识别页面视频",
        `标题：${title || bvid}`,
        `BV号：${bvid}`,
        detectedCount ? `识别到：${detectedCount} 个视频，已勾选 ${selectedCount} 个。` : "",
        `默认：合并视频+音频MP4，清晰度 ${qualityDisplayLabel()}。`,
        "还要字幕、封面、信息或弹幕时，可继续多选后点“开始”。",
      ].filter(Boolean).join("\n"));
    } catch (error) {
      if (force) {
        setStatus("未识别到当前页面视频。请打开 B 站视频播放页后刷新再试。");
      }
    }
  }

  function setButtonText(root, selector, value) {
    const button = root.querySelector(selector);
    if (button) {
      button.textContent = value;
    }
  }

  function updateSelectLabels(select, labels) {
    if (!select) {
      return;
    }
    Array.from(select.options).forEach((option) => {
      if (labels[option.value]) {
        option.textContent = labels[option.value];
      }
    });
  }

  function updateModeLabels(container, labels) {
    if (!container) {
      return;
    }
    Array.from(container.querySelectorAll("[data-mode-label]")).forEach((label) => {
      const value = label.getAttribute("data-mode-label");
      if (labels[value]) {
        label.textContent = labels[value];
      }
    });
  }

  function openSettingsPanel() {
    const old = document.querySelector(".bilifetch-settings-backdrop");
    if (old) {
      old.remove();
    }

    const settings = loadSettings();
    const backdrop = document.createElement("div");
    backdrop.className = "bilifetch-settings-backdrop";
    backdrop.innerHTML = `
      <section class="bilifetch-settings-dialog" role="dialog" aria-modal="true" aria-label="BiliFetch 设置">
        <h2>BiliFetch 设置</h2>
        <div class="bf-settings-body">
          <label>
            合并前提醒阈值（MB）
            <input id="bilifetch-setting-merge-warn" type="number" min="50" max="20000" step="50" value="${escapeHtml(String(settings.mergeWarnMB))}">
          </label>
          <label>
            界面语言 / Language
            <select id="bilifetch-setting-language">
              <option value="zh" ${settings.language === "en" ? "" : "selected"}>中文</option>
              <option value="en" ${settings.language === "en" ? "selected" : ""}>English</option>
            </select>
          </label>
          <label class="bf-check">
            <input id="bilifetch-setting-changelog" type="checkbox" ${settings.showChangelog ? "checked" : ""}>
            显示版本更新提示
          </label>
          <label class="bf-check">
            <input id="bilifetch-setting-helper" type="checkbox" ${settings.useLocalHelper ? "checked" : ""}>
            优先使用本地助手自动下载合并
          </label>
          <label class="bf-check">
            <input id="bilifetch-setting-tips" type="checkbox" ${settings.detailedErrorTips ? "checked" : ""}>
            报错时显示中文解决建议
          </label>
          <div class="bf-settings-actions">
            <button class="bf-save" id="bilifetch-settings-save" type="button">保存</button>
            <button id="bilifetch-settings-close" type="button">关闭</button>
          </div>
        </div>
      </section>
    `;
    document.documentElement.appendChild(backdrop);

    backdrop.querySelector("#bilifetch-settings-close").addEventListener("click", () => backdrop.remove());
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        backdrop.remove();
      }
    });
    backdrop.querySelector("#bilifetch-settings-save").addEventListener("click", () => {
      const mergeWarnMB = Number(backdrop.querySelector("#bilifetch-setting-merge-warn").value || DEFAULT_SETTINGS.mergeWarnMB);
      saveSettings({
        mergeWarnMB: Math.max(50, Math.min(20000, mergeWarnMB)),
        showChangelog: backdrop.querySelector("#bilifetch-setting-changelog").checked,
        saveCommandsOnMergeFail: false,
        autoSaveBat: false,
        useLocalHelper: backdrop.querySelector("#bilifetch-setting-helper").checked,
        allowBrowserMerge: true,
        detailedErrorTips: backdrop.querySelector("#bilifetch-setting-tips").checked,
        language: backdrop.querySelector("#bilifetch-setting-language").value === "en" ? "en" : "zh",
      });
      backdrop.remove();
      applyLanguage();
      appendStatus("设置已保存。");
    });
  }

  function showChangelogIfNeeded() {
    const settings = loadSettings();
    const seenVersion = localStorage.getItem(STORAGE_SEEN_VERSION_KEY);
    if (!settings.showChangelog || seenVersion === SCRIPT_VERSION) {
      return;
    }
    showChangelog(false);
    localStorage.setItem(STORAGE_SEEN_VERSION_KEY, SCRIPT_VERSION);
  }

  function showChangelog(force) {
    const lines = [
      `BiliFetch 已更新到 ${SCRIPT_VERSION}`,
      "- 自动识别当前页面视频，并显示标题和 BV号。",
      "- 新增清晰度选择，默认“最高可用”。",
      "- 选择 1080P、720P 等清晰度时，会自动挑选合适的视频流。",
      "- 去掉旧范围下拉框，改为识别所有视频后自行勾选。",
      "- 下载内容改为多选，默认勾选“合并视频+音频MP4”。",
      "- 可同时选择字幕、弹幕、封面、信息 JSON、命令导出等内容。",
      "- 合并不再自动生成 Windows bat；本地助手未启动时会尝试浏览器内自动合并。",
      "- 面板顶部标题栏现在可以拖动，并会记住上次位置。",
    ];
    if (force) {
      setStatus(lines.join("\n"));
    } else {
      appendStatus(`\n${lines.join("\n")}`);
    }
  }

  function setBusy(value) {
    running = value;
    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      return;
    }
    panel.querySelectorAll("button, select, input").forEach((element) => {
      element.disabled = value;
    });
  }

  function setStatus(message) {
    lastDiagnostics = [message];
    const status = document.getElementById(STATUS_ID);
    if (status) {
      status.textContent = message;
    }
  }

  function appendStatus(message) {
    lastDiagnostics.push(message);
    if (lastDiagnostics.length > 80) {
      lastDiagnostics = lastDiagnostics.slice(-80);
    }

    const status = document.getElementById(STATUS_ID);
    if (!status) {
      return;
    }
    const prefix = status.textContent.trim() ? "\n" : "";
    status.textContent += `${prefix}${message}`;
    status.scrollTop = status.scrollHeight;
  }

  function setProgress(percent, label) {
    const bar = document.getElementById(PROGRESS_ID);
    const text = document.getElementById(PROGRESS_TEXT_ID);
    const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
    if (bar) {
      bar.style.width = `${safePercent}%`;
    }
    if (text) {
      text.textContent = label || `${Math.round(safePercent)}%`;
    }
  }

  function showError(error) {
    lastError = {
      message: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : "",
      time: new Date().toISOString(),
    };
    appendStatus(`失败：${lastError.message}`);
    if (loadSettings().detailedErrorTips) {
      const tips = diagnoseError(error);
      if (tips.length) {
        appendStatus(`解决建议：\n- ${tips.join("\n- ")}`);
      }
    }
    setProgress(0, "已失败，可点“复制诊断”发给作者");
  }

  function diagnoseError(error) {
    const message = `${error && error.message ? error.message : String(error || "")}\n${error && error.stack ? error.stack : ""}`;
    const tips = [];
    if (/BV|视频页|识别/i.test(message)) {
      tips.push("确认打开的是普通 B 站视频页，地址里最好包含 BV 号。");
    }
    if (/401|403|登录|会员|权限|地区|copyright|forbidden/i.test(message)) {
      tips.push("先在浏览器里登录 B 站，并确认当前账号能正常播放这个清晰度。");
      tips.push("脚本不会绕过会员、版权、地区或登录限制。");
    }
    if (/ffmpeg|wasm|@require|core|SharedArrayBuffer|跨源|CORS/i.test(message)) {
      tips.push("自动合并依赖 ffmpeg.wasm；如果浏览器或脚本猫拦截外部库，请改用“复制ffmpeg/aria2命令”模式。");
      tips.push("上传审核或不想合并时，建议保持默认的“复制ffmpeg/aria2命令”模式。");
    }
    if (/memory|内存|quota|ArrayBuffer|allocation|out of/i.test(message)) {
      tips.push("文件可能太大，浏览器内存不够。建议只复制命令，或使用电脑便携版合并。");
    }
    if (/timeout|超时|network|fetch|网络/i.test(message)) {
      tips.push("网络请求超时，可以刷新页面重试，或确认浏览器没有拦截脚本猫的跨域请求。");
    }
    if (/GM_download|下载失败|download/i.test(message)) {
      tips.push("检查浏览器是否禁止多个文件下载，脚本猫是否允许下载权限。");
    }
    if (/412|风控|risk|captcha|verify|验证|访问被拒绝/i.test(message)) {
      tips.push("可能触发了 B 站风控。请先在网页里正常播放几秒，必要时完成验证后再重试。");
    }
    if (/404|-404|not found|不存在|失效/i.test(message)) {
      tips.push("视频、分P或直链可能失效。请刷新页面后重新生成命令，直链不要隔太久再用。");
    }
    if (/429|too many|频繁|rate/i.test(message)) {
      tips.push("请求太频繁。请等待一会儿再试，视频很多时建议先少选几个。");
    }
    if (/ffmpeg\.exe|ffmpeg not found|未找到 ffmpeg|not recognized/i.test(message)) {
      tips.push("本地助手需要 ffmpeg。请确认本地助手窗口里 ffmpeg 检测通过。");
    }
    if (/curl|Invoke-WebRequest|PowerShell|SSL|certificate|证书/i.test(message)) {
      tips.push("网络下载失败时，确认当前网络能访问 B 站视频直链。");
    }
    if (/disk|space|ENOSPC|磁盘|空间不足/i.test(message)) {
      tips.push("磁盘空间可能不足。请清理下载目录后再运行脚本或本地助手。");
    }
    if (/blocked|拦截|permission|权限|allow|禁止/i.test(message)) {
      tips.push("浏览器或脚本猫可能拦截了下载、剪贴板或外部库权限，请在扩展权限里允许脚本运行。");
    }
    if (!tips.length) {
      tips.push("点击“复制诊断”，把复制内容和视频链接一起发给作者排查。");
    }
    return Array.from(new Set(tips));
  }

  function getInitialState() {
    return pageWindow.__INITIAL_STATE__ || {};
  }

  function getPagePlayInfo() {
    const playInfo = pageWindow.__playinfo__;
    if (!playInfo) {
      return null;
    }
    return playInfo.data || playInfo.result || playInfo;
  }

  function getBvid() {
    const pathMatch = location.pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }

    const search = new URLSearchParams(location.search);
    const queryBvid = search.get("bvid");
    if (queryBvid && /^BV[a-zA-Z0-9]+$/.test(queryBvid)) {
      return queryBvid;
    }

    const state = getInitialState();
    const stateBvid = state.bvid || (state.videoData && state.videoData.bvid);
    if (stateBvid && /^BV[a-zA-Z0-9]+$/.test(stateBvid)) {
      return stateBvid;
    }

    throw new Error("没有识别到 BV 号。请打开普通 B 站视频页，例如 https://www.bilibili.com/video/BV...。");
  }

  function getCurrentPageNumber() {
    const page = Number(new URLSearchParams(location.search).get("p") || "1");
    return Number.isFinite(page) && page > 0 ? page : 1;
  }

  async function requestText(url, options = {}) {
    const headers = Object.assign({ Referer: location.href }, options.headers || {});

    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: options.method || "GET",
          url,
          headers,
          responseType: "text",
          timeout: options.timeout || 25000,
          onload(response) {
            if (response.status >= 200 && response.status < 300) {
              resolve(response.responseText || "");
              return;
            }
            reject(new Error(`接口返回 HTTP ${response.status}`));
          },
          onerror() {
            reject(new Error("网络请求失败"));
          },
          ontimeout() {
            reject(new Error("网络请求超时"));
          },
        });
      });
    }

    const response = await fetch(url, {
      method: options.method || "GET",
      credentials: "include",
      headers,
    });
    if (!response.ok) {
      throw new Error(`接口返回 HTTP ${response.status}`);
    }
    return response.text();
  }

  async function requestArrayBuffer(url, options = {}) {
    const headers = Object.assign(
      {
        Referer: "https://www.bilibili.com/",
        Origin: "https://www.bilibili.com",
      },
      options.headers || {},
    );

    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          headers,
          responseType: "arraybuffer",
          timeout: options.timeout || 180000,
          onload(response) {
            if (response.status >= 200 && response.status < 300) {
              resolve(response.response);
              return;
            }
            reject(new Error(`文件下载接口返回 HTTP ${response.status}`));
          },
          onerror() {
            reject(new Error("文件下载请求失败"));
          },
          ontimeout() {
            reject(new Error("文件下载超时"));
          },
        });
      });
    }

    const response = await fetch(url, {
      credentials: "include",
      headers,
    });
    if (!response.ok) {
      throw new Error(`文件下载接口返回 HTTP ${response.status}`);
    }
    return response.arrayBuffer();
  }

  async function requestStreamArrayBuffer(stream, label) {
    const candidates = uniqueUrls([stream && stream.url].concat((stream && stream.backupUrls) || []));
    let lastError = null;
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      try {
        if (index > 0) {
          appendStatus(`${label}主链接失败，尝试备用链接 ${index}/${candidates.length - 1}...`);
        }
        return await requestArrayBuffer(candidate);
      } catch (error) {
        lastError = error;
        appendStatus(`${label}链接 ${index + 1}/${candidates.length} 失败：${error.message}`);
      }
    }
    throw new Error(`${label}所有可用链接都失败：${lastError ? lastError.message : "未知错误"}`);
  }

  function uniqueUrls(urls) {
    const seen = new Set();
    return urls
      .filter(Boolean)
      .map(normalizeUrl)
      .filter((url) => {
        if (seen.has(url)) {
          return false;
        }
        seen.add(url);
        return true;
      });
  }

  async function requestJson(url, options = {}) {
    const text = await requestText(url, options);
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`接口没有返回 JSON：${error.message}`);
    }
  }

  function unwrapBiliData(payload, label) {
    if (!payload) {
      throw new Error(`${label}为空`);
    }
    if (Object.prototype.hasOwnProperty.call(payload, "code") && payload.code !== 0) {
      throw new Error(`${label}失败：${payload.message || payload.msg || payload.code}`);
    }
    return payload.data || payload.result || payload;
  }

  async function getViewInfo(bvid) {
    try {
      const json = await requestJson(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`);
      return unwrapBiliData(json, "视频信息接口");
    } catch (error) {
      const state = getInitialState();
      if (state.videoData && state.videoData.bvid) {
        appendStatus("视频信息接口读取失败，改用页面里已有的信息。");
        return state.videoData;
      }
      throw error;
    }
  }

  function pickVideoPage(view) {
    const pages = Array.isArray(view.pages) ? view.pages : [];
    if (!pages.length && view.cid) {
      return {
        cid: view.cid,
        page: 1,
        part: view.title || view.bvid || "video",
      };
    }
    const current = getCurrentPageNumber();
    return pages.find((item) => Number(item.page) === current) || pages[0];
  }

  async function getPlayInfo(bvid, cid, allowPageCache) {
    const pagePlayInfo = allowPageCache ? getPagePlayInfo() : null;

    const url = new URL("https://api.bilibili.com/x/player/playurl");
    url.searchParams.set("bvid", bvid);
    url.searchParams.set("cid", cid);
    url.searchParams.set("qn", selectedQualityQn());
    url.searchParams.set("fnval", "4048");
    url.searchParams.set("fnver", "0");
    url.searchParams.set("fourk", "1");
    url.searchParams.set("high_quality", "1");
    try {
      const json = await requestJson(url.toString());
      return unwrapBiliData(json, "播放地址接口");
    } catch (error) {
      if (pagePlayInfo && (pagePlayInfo.dash || pagePlayInfo.durl)) {
        appendStatus(`播放地址接口读取失败，改用页面缓存：${error.message}`);
        return pagePlayInfo;
      }
      throw error;
    }
  }

  async function getPlayerInfo(bvid, cid) {
    const url = new URL("https://api.bilibili.com/x/player/v2");
    url.searchParams.set("bvid", bvid);
    url.searchParams.set("cid", cid);
    const json = await requestJson(url.toString());
    return unwrapBiliData(json, "播放器信息接口");
  }

  async function fetchBaseInfo() {
    const bvid = getBvid();
    const view = await getViewInfo(bvid);
    return { bvid, view };
  }

  async function buildBase() {
    const bvid = getBvid();
    appendStatus(`识别到视频：${bvid}`);
    appendStatus("读取视频基础信息...");
    const base = await fetchBaseInfo();
    renderVideoChoices(base, { preserve: true });
    return base;
  }

  async function buildContext(base, page, options = {}) {
    if (!page || !page.cid) {
      throw new Error("没有找到所选视频的 cid。请刷新视频页后再试。");
    }

    const context = {
      bvid: base.bvid,
      cid: page.cid,
      view: base.view,
      page,
      baseName: makeBaseName(base.view, page),
      playInfo: null,
      playerInfo: null,
    };

    if (options.needPlay) {
      appendStatus(`读取音视频流：${qualityDisplayLabel()}...`);
      context.playInfo = await getPlayInfo(base.bvid, page.cid, page === pickVideoPage(base.view));
    }

    if (options.needPlayer) {
      appendStatus("读取字幕信息...");
      context.playerInfo = await getPlayerInfo(base.bvid, page.cid);
    }

    return context;
  }

  function modeNeedsPlay(mode) {
    return ["auto", "full_merge", "merge", "full", "video", "audio", "commands", "copy"].includes(mode);
  }

  function modeNeedsPlayer(mode) {
    return ["full_merge", "full", "subtitles", "copy"].includes(mode);
  }

  function modesNeedPlay(values) {
    return values.some((mode) => modeNeedsPlay(mode));
  }

  function modesNeedPlayer(values) {
    return values.some((mode) => modeNeedsPlayer(mode));
  }

  async function previewSelectedMode() {
    if (running) {
      return;
    }
    setBusy(true);
    setStatus("正在生成下载清单...");
    setProgress(8, "读取页面信息");
    try {
      const selected = selectedModes();
      const base = await buildBase();
      const pages = selectedTargetPages(base.view);
      const lines = [
        "下载前预览",
        `下载内容：${selected.map((mode) => labelOf(modes, mode)).join("、")}`,
        `已选择视频：共 ${pages.length} 个`,
        `清晰度：${qualityDisplayLabel()}`,
        "",
      ];

      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        const baseName = makeBaseName(base.view, page);
        setProgress(10 + Math.round((index / Math.max(1, pages.length)) * 80), `预览 ${index + 1}/${pages.length}`);
        lines.push(`P${page.page || index + 1}：${page.part || "未命名"}`);
        let context = null;
        if (modesNeedPlay(selected)) {
          try {
            context = await buildContext(base, page, { needPlay: true, needPlayer: false });
          } catch (error) {
            lines.push(`  - 大小预估失败：${error.message}`);
          }
        }
        selected.forEach((mode) => {
          lines.push(...previewFilesForMode(mode, baseName, context));
        });
        lines.push("");
      }

      if (selected.includes("merge")) {
        lines.push("合并提示：优先交给本地助手自动下载合并；本地助手未启动时会尝试浏览器内自动合并，不生成 bat。");
      }

      setStatus(lines.join("\n"));
      setProgress(100, "预览完成");
    } finally {
      setBusy(false);
    }
  }

  function previewFilesForMode(mode, baseName, context) {
    const lines = [];
    if (mode === "auto") {
      lines.push(`  - 自动选择最省操作的处理方式`);
      lines.push(`  - 优先直接下载完整MP4或浏览器内合并`);
      lines.push(`  - 不生成 bat，合并失败时显示原因`);
    } else if (mode === "full_merge") {
      lines.push(`  - ${baseName}.info.json`);
      lines.push(`  - ${baseName}.cover.jpg/png/webp`);
      lines.push(`  - ${baseName}.字幕.srt/json（如果视频有字幕）`);
      lines.push(`  - ${baseName}.danmaku.xml/csv/txt/ass`);
      lines.push(`  - ${baseName}.merged.mp4（实验合并，失败则导出命令）`);
    } else if (mode === "merge") {
      lines.push(`  - ${baseName}.merged.mp4（优先本地助手；未启动则浏览器内自动合并）`);
    } else if (mode === "full") {
      lines.push(`  - ${baseName}.info.json`);
      lines.push(`  - ${baseName}.cover.jpg/png/webp`);
      lines.push(`  - ${baseName}.字幕.srt/json（如果视频有字幕）`);
      lines.push(`  - ${baseName}.danmaku.xml/csv/txt/ass`);
      lines.push(`  - ${baseName}.video-所选清晰度.m4s 和 ${baseName}.audio-最高音质.m4s`);
    } else if (mode === "video") {
      lines.push(`  - ${baseName}.video-所选清晰度.m4s 或完整 mp4`);
    } else if (mode === "audio") {
      lines.push(`  - ${baseName}.audio-最高音质.m4s`);
    } else if (mode === "subtitles") {
      lines.push(`  - ${baseName}.字幕.srt/json（如果视频有字幕）`);
    } else if (mode === "danmaku") {
      lines.push(`  - ${baseName}.danmaku.xml/csv/txt/ass`);
    } else if (mode === "cover") {
      lines.push(`  - ${baseName}.cover.jpg/png/webp`);
    } else if (mode === "info") {
      lines.push(`  - ${baseName}.info.json`);
    } else if (mode === "commands") {
      lines.push("  - 复制 aria2 下载命令和 ffmpeg 合并命令");
      lines.push(`  - ${baseName}.commands.txt`);
    } else if (mode === "copy") {
      lines.push("  - 复制标题、BV号、CID、封面、弹幕、音视频直链和字幕链接");
    }
    if (context && context.playInfo) {
      lines.push(`  - 估算大小：${formatEstimate(estimateDownloadSize(context))}`);
    }
    return lines;
  }

  async function runSelectedMode() {
    if (running) {
      return;
    }

    setBusy(true);
    setStatus("开始处理...");
    setProgress(5, "准备中");
    try {
      const selected = selectedModes();
      const base = await buildBase();
      const pages = selectedTargetPages(base.view);
      appendStatus(`已选择视频：共 ${pages.length} 个。`);
      appendStatus(`下载内容：${selected.map((mode) => labelOf(modes, mode)).join("、")}`);
      appendStatus(`清晰度：${qualityDisplayLabel()}。`);

      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        const pageLabel = `P${page.page || index + 1} ${page.part || ""}`.trim();
        appendStatus(`\n[${index + 1}/${pages.length}] 开始：${pageLabel}`);
        setProgress(Math.round((index / Math.max(1, pages.length)) * 90), `处理 ${index + 1}/${pages.length}`);

        const context = await buildContext(base, page, {
          needPlay: modesNeedPlay(selected),
          needPlayer: modesNeedPlayer(selected),
        });
        if (context.playInfo && modesNeedPlay(selected)) {
          appendEstimateForContext(context, selected);
        }
        for (const mode of selected) {
          appendStatus(`执行：${labelOf(modes, mode)}`);
          await runModeForContext(mode, context);
        }
      }

      setProgress(100, "全部任务已发起或保存");
      appendStatus("完成检查：脚本已把能处理的内容交给浏览器下载、保存或复制。");
    } finally {
      setBusy(false);
    }
  }

  async function runModeForContext(mode, context) {
    if (mode === "auto") {
      await runAutoForContext(context);
    } else if (mode === "full_merge") {
      await exportInfo(context);
      await exportCover(context);
      await exportSubtitles(context);
      await exportDanmaku(context);
      await mergeOrGuide(context);
    } else if (mode === "merge") {
      await mergeOrGuide(context);
    } else if (mode === "full") {
      await exportInfo(context);
      await exportCover(context);
      await exportSubtitles(context);
      await exportDanmaku(context);
      startBestVideoDownload(context);
      startBestAudioDownload(context);
      appendStatus("完整导出已发起。此模式不合并，视频流和音频流通常是两个文件。");
    } else if (mode === "video") {
      startBestVideoDownload(context);
    } else if (mode === "audio") {
      startBestAudioDownload(context);
    } else if (mode === "subtitles") {
      await exportSubtitles(context);
    } else if (mode === "danmaku") {
      await exportDanmaku(context);
    } else if (mode === "cover") {
      await exportCover(context);
    } else if (mode === "info") {
      await exportInfo(context);
    } else if (mode === "commands") {
      await copyCommandReport(context);
    } else if (mode === "copy") {
      await copyLinkReport(context);
    } else {
      throw new Error(`未知模式：${mode}`);
    }
  }

  function makeBaseName(view, page) {
    const title = view.title || view.bvid || "bilibili";
    const pages = Array.isArray(view.pages) ? view.pages : [];
    const pageLabel = pages.length > 1 ? `P${page.page}-${page.part || "part"}` : "";
    return sanitizeFilename([title, pageLabel].filter(Boolean).join(" "));
  }

  function sanitizeFilename(value) {
    const cleaned = String(value || "")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim();
    return (cleaned || "bilibili").slice(0, 120);
  }

  function sanitizeDownloadFilename(value) {
    const text = String(value || "bilibili");
    const extensionMatch = text.match(/(\.[a-zA-Z0-9]{2,5})$/);
    const extension = extensionMatch ? extensionMatch[1] : "";
    const stem = extension ? text.slice(0, -extension.length) : text;
    return `${sanitizeFilename(stem).slice(0, 112)}${extension}`;
  }

  function collectStreams(playInfo) {
    const result = {
      videos: [],
      audios: [],
      durls: [],
      bestVideo: null,
      bestAudio: null,
    };

    if (!playInfo) {
      return result;
    }

    if (Array.isArray(playInfo.durl)) {
      result.durls = playInfo.durl
        .map((item, index) => ({
          url: item.url || item.base_url || item.baseUrl,
          size: item.size || 0,
          order: index + 1,
        }))
        .filter((item) => item.url);
    }

    const dash = playInfo.dash || {};
    if (Array.isArray(dash.video)) {
      result.videos = dash.video
        .map((item) => ({
          raw: item,
          url: item.baseUrl || item.base_url || item.url,
          backupUrls: item.backupUrl || item.backup_url || [],
          id: item.id || item.quality,
          codecs: item.codecs || "",
          width: Number(item.width || 0),
          height: Number(item.height || 0),
          bandwidth: Number(item.bandwidth || 0),
        }))
        .filter((item) => item.url)
        .sort((a, b) => streamScore(b) - streamScore(a));
      result.bestVideo = chooseBestVideo(result.videos);
    }

    if (Array.isArray(dash.audio)) {
      result.audios = dash.audio
        .map((item) => ({
          raw: item,
          url: item.baseUrl || item.base_url || item.url,
          backupUrls: item.backupUrl || item.backup_url || [],
          id: item.id || item.quality,
          codecs: item.codecs || "",
          bandwidth: Number(item.bandwidth || 0),
        }))
        .filter((item) => item.url)
        .sort((a, b) => Number(b.bandwidth || 0) - Number(a.bandwidth || 0));
      result.bestAudio = result.audios[0] || null;
    }

    return result;
  }

  function chooseBestVideo(videos) {
    const sorted = Array.isArray(videos) ? videos : [];
    if (!sorted.length) {
      return null;
    }
    const maxHeight = selectedQualityMaxHeight();
    if (!Number.isFinite(maxHeight)) {
      return sorted[0];
    }
    const bestWithinLimit = sorted.find((video) => Number(video.height || 0) > 0 && Number(video.height || 0) <= maxHeight);
    if (bestWithinLimit) {
      return bestWithinLimit;
    }
    return sorted[sorted.length - 1] || sorted[0];
  }

  function estimateDownloadSize(context) {
    const streams = collectStreams(context.playInfo);
    const duration = getDurationSeconds(context);
    const videoBytes = streams.bestVideo ? estimateStreamBytes(streams.bestVideo, duration) : 0;
    const audioBytes = streams.bestAudio ? estimateStreamBytes(streams.bestAudio, duration) : 0;
    const durlBytes = streams.durls.reduce((sum, item) => sum + Number(item.size || 0), 0);
    const totalBytes = durlBytes || videoBytes + audioBytes;
    return {
      duration,
      videoBytes,
      audioBytes,
      durlBytes,
      totalBytes,
      precise: Boolean(durlBytes),
    };
  }

  function estimateStreamBytes(stream, durationSeconds) {
    const directSize = Number(stream.raw && (stream.raw.size || stream.raw.filesize || stream.raw.file_size));
    if (Number.isFinite(directSize) && directSize > 0) {
      return directSize;
    }
    const bandwidth = Number(stream.bandwidth || (stream.raw && stream.raw.bandwidth) || 0);
    if (!bandwidth || !durationSeconds) {
      return 0;
    }
    return Math.round((bandwidth * durationSeconds) / 8);
  }

  function getDurationSeconds(context) {
    const playMs = Number(context.playInfo && context.playInfo.timelength);
    if (Number.isFinite(playMs) && playMs > 0) {
      return playMs / 1000;
    }
    const pageDuration = Number(context.page && context.page.duration);
    if (Number.isFinite(pageDuration) && pageDuration > 0) {
      return pageDuration;
    }
    const viewDuration = Number(context.view && context.view.duration);
    if (Number.isFinite(viewDuration) && viewDuration > 0) {
      return viewDuration;
    }
    return 0;
  }

  function formatEstimate(estimate) {
    const parts = [];
    if (estimate.videoBytes) {
      parts.push(`视频约 ${formatBytes(estimate.videoBytes)}`);
    }
    if (estimate.audioBytes) {
      parts.push(`音频约 ${formatBytes(estimate.audioBytes)}`);
    }
    if (estimate.durlBytes) {
      parts.push(`完整视频 ${formatBytes(estimate.durlBytes)}`);
    }
    if (!parts.length) {
      return "暂时无法估算";
    }
    parts.push(`总计${estimate.precise ? "" : "约"} ${formatBytes(estimate.totalBytes)}`);
    return parts.join("，");
  }

  function appendEstimateForContext(context, mode) {
    const selected = Array.isArray(mode) ? mode : [mode];
    const estimate = estimateDownloadSize(context);
    if (!estimate.totalBytes) {
      appendStatus("大小预估：暂时无法估算。");
      return;
    }
    appendStatus(`大小预估：${formatEstimate(estimate)}`);
    const settings = loadSettings();
    const warnBytes = Number(settings.mergeWarnMB || DEFAULT_SETTINGS.mergeWarnMB) * 1024 * 1024;
    if (selected.some((value) => ["full_merge", "merge"].includes(value)) && estimate.totalBytes >= warnBytes) {
      appendStatus(`提醒：预计 ${formatBytes(estimate.totalBytes)}，超过设置阈值 ${settings.mergeWarnMB} MB。浏览器内合并可能很慢或失败，建议改用“复制ffmpeg/aria2命令”。`);
    }
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!value) {
      return "0 B";
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    let index = 0;
    let size = value;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
  }

  function streamScore(item) {
    return Number(item.height || 0) * 100000000 + Number(item.width || 0) * 100000 + Number(item.bandwidth || 0);
  }

  function startBestVideoDownload(context) {
    const streams = collectStreams(context.playInfo);
    if (streams.durls.length) {
      streams.durls.forEach((item) => {
        const suffix = streams.durls.length > 1 ? `.part${String(item.order).padStart(2, "0")}` : "";
        startRemoteDownload(item.url, `${context.baseName}${suffix}.mp4`, `完整视频${suffix || ""}`);
      });
      return;
    }

    if (!streams.bestVideo) {
      appendStatus("没有拿到视频流。可能需要登录、会员权限，或 B 站接口规则变化。");
      return;
    }

    const label = makeVideoLabel(streams.bestVideo);
    startRemoteDownload(streams.bestVideo.url, `${context.baseName}.video-${label}.m4s`, `视频流 ${label}`);
    appendStatus("提示：DASH 视频流通常没有声音，需要声音请再下载音频或使用合并模式。");
  }

  function startBestAudioDownload(context) {
    const streams = collectStreams(context.playInfo);
    if (!streams.bestAudio) {
      if (streams.durls.length) {
        appendStatus("当前页面只给了完整视频地址，浏览器脚本不能从完整视频里单独拆出音频。");
      } else {
        appendStatus("没有拿到音频流。可能需要登录、会员权限，或 B 站接口规则变化。");
      }
      return;
    }

    const label = makeAudioLabel(streams.bestAudio);
    startRemoteDownload(streams.bestAudio.url, `${context.baseName}.audio-${label}.m4s`, `音频 ${label}`);
  }

  async function runAutoForContext(context) {
    const streams = collectStreams(context.playInfo);
    appendStatus("自动模式：开始选择最省操作的处理方式。");
    const settings = loadSettings();

    if (await sendContextToLocalHelper(context, streams, "一键自动处理")) {
      return;
    }

    if (streams.durls.length) {
      appendStatus("自动模式：当前接口已给出完整 MP4，直接交给浏览器下载。");
      startBestVideoDownload(context);
      return;
    }

    if (!streams.bestVideo || !streams.bestAudio) {
      appendStatus("自动模式：缺少视频流或音频流，无法自动合并；不会生成 bat。");
      return;
    }

    const estimate = estimateDownloadSize(context);
    const warnBytes = Number(settings.mergeWarnMB || DEFAULT_SETTINGS.mergeWarnMB) * 1024 * 1024;
    if (estimate.totalBytes && estimate.totalBytes >= warnBytes) {
      appendStatus(`自动模式：预计 ${formatBytes(estimate.totalBytes)}，文件较大，浏览器内合并可能较慢；仍会自动尝试，不生成 bat。`);
    }

    try {
      appendStatus("自动模式：尝试浏览器内自动合并。");
      await mergeWithFfmpegWasm(context, streams.bestVideo, streams.bestAudio);
    } catch (error) {
      appendStatus(`自动模式：浏览器内合并失败：${error.message}`);
      appendStatus("自动模式：不会下载分离音视频，也不会生成 bat。请启动本地助手后重试，或手动选择“导出合并命令”。");
    }
  }

  function makeVideoLabel(video) {
    const resolution = video.height ? `${video.height}p` : "best";
    const codec = video.codecs ? video.codecs.split(".")[0] : "video";
    return sanitizeFilename(`${resolution}-${codec}`);
  }

  function makeAudioLabel(audio) {
    const bitrate = audio.bandwidth ? `${Math.round(audio.bandwidth / 1000)}k` : "best";
    const codec = audio.codecs ? audio.codecs.split(".")[0] : "audio";
    return sanitizeFilename(`${bitrate}-${codec}`);
  }

  function startRemoteDownload(url, filename, label) {
    if (!url) {
      appendStatus(`${label}：没有可用链接。`);
      return;
    }

    const safeName = sanitizeDownloadFilename(filename);
    if (typeof GM_download === "function") {
      try {
        GM_download({
          url,
          name: safeName,
          headers: {
            Referer: location.href,
            Origin: "https://www.bilibili.com",
          },
          saveAs: false,
          onload() {
            appendStatus(`${label}：浏览器下载完成。`);
          },
          onerror(error) {
            appendStatus(`${label}：下载失败，已复制直链。请确认脚本猫和浏览器允许下载。`);
            copyText(url);
            console.warn("[BiliFetch] GM_download failed", error);
          },
          ontimeout() {
            appendStatus(`${label}：下载超时，已复制直链。`);
            copyText(url);
          },
        });
        appendStatus(`${label}：已交给浏览器下载 -> ${safeName}`);
        return;
      } catch (error) {
        appendStatus(`${label}：脚本下载接口不可用，改为复制直链。`);
        console.warn("[BiliFetch] GM_download exception", error);
      }
    }

    copyText(url);
    window.open(url, "_blank", "noopener,noreferrer");
    appendStatus(`${label}：已复制直链并尝试打开新标签页。`);
  }

  async function mergeOrGuide(context) {
    const streams = collectStreams(context.playInfo);
    const settings = loadSettings();

    if (await sendContextToLocalHelper(context, streams, "用户选择合并模式")) {
      return;
    }

    if (streams.durls.length) {
      appendStatus("当前接口给出了完整 MP4，不需要合并，直接下载完整视频。");
      startBestVideoDownload(context);
      return;
    }

    if (!streams.bestVideo || !streams.bestAudio) {
      appendStatus("缺少视频流或音频流，无法自动合并；不会生成 bat。");
      return;
    }

    const estimate = estimateDownloadSize(context);
    const warnBytes = Number(settings.mergeWarnMB || DEFAULT_SETTINGS.mergeWarnMB) * 1024 * 1024;
    if (estimate.totalBytes && estimate.totalBytes >= warnBytes) {
      appendStatus(`预计 ${formatBytes(estimate.totalBytes)}，超过 ${settings.mergeWarnMB} MB。浏览器内合并可能较慢；仍会自动尝试，不生成 bat。`);
    }

    try {
      await mergeWithFfmpegWasm(context, streams.bestVideo, streams.bestAudio);
    } catch (error) {
      appendStatus(`浏览器内合并失败：${error.message}`);
      appendStatus("合并模式不会下载分离音视频，也不会生成 bat。请启动本地助手后重试，或手动选择“导出合并命令”。");
    }
  }

  async function mergeWithFfmpegWasm(context, video, audio) {
    appendStatus("开始浏览器内合并：加载 ffmpeg.wasm，首次使用会比较慢。");
    setProgress(15, "加载合并引擎");
    const ffmpeg = await getFfmpeg();

    appendStatus("下载视频流到浏览器内存...");
    setProgress(30, "下载视频流");
    const videoBytes = new Uint8Array(await requestStreamArrayBuffer(video, "视频流"));

    appendStatus("下载音频流到浏览器内存...");
    setProgress(48, "下载音频流");
    const audioBytes = new Uint8Array(await requestStreamArrayBuffer(audio, "音频流"));

    const videoName = "input-video.m4s";
    const audioName = "input-audio.m4s";
    const outputName = "output.mp4";

    appendStatus("写入临时文件并开始合并...");
    setProgress(62, "写入临时文件");
    await ffmpeg.writeFile(videoName, videoBytes);
    await ffmpeg.writeFile(audioName, audioBytes);

    setProgress(72, "正在合并 MP4");
    await ffmpeg.exec([
      "-i",
      videoName,
      "-i",
      audioName,
      "-c",
      "copy",
      "-movflags",
      "faststart",
      outputName,
    ]);

    const output = await ffmpeg.readFile(outputName);
    const blob = new Blob([output], { type: "video/mp4" });
    downloadBlob(`${context.baseName}.merged.mp4`, blob);
    setProgress(92, "清理临时文件");
    await cleanupFfmpegFiles(ffmpeg, [videoName, audioName, outputName]);
    appendStatus(`自动合并完成：${context.baseName}.merged.mp4`);
  }

  async function getFfmpeg() {
    if (ffmpegInstance && ffmpegLoaded) {
      return ffmpegInstance;
    }

    const ffmpegLib = pageWindow.FFmpegWASM;
    const utilLib = pageWindow.FFmpegUtil;
    if (!ffmpegLib || !ffmpegLib.FFmpeg || !utilLib || !utilLib.toBlobURL) {
      throw new Error("ffmpeg.wasm 没有加载成功。可能是脚本猫禁止 @require，或浏览器拦截了外部库。");
    }

    let lastLoadError = null;
    for (const base of FFMPEG_CORE_BASES) {
      const candidate = new ffmpegLib.FFmpeg();
      candidate.on("log", ({ message }) => {
        if (message && /error|invalid|failed/i.test(message)) {
          console.warn("[BiliFetch ffmpeg]", message);
        }
      });
      candidate.on("progress", ({ progress }) => {
        if (Number.isFinite(progress)) {
          setProgress(72 + Math.round(progress * 18), "正在合并 MP4");
        }
      });
      try {
        await candidate.load({
          coreURL: await utilLib.toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await utilLib.toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
        });
        ffmpegInstance = candidate;
        ffmpegLoaded = true;
        return ffmpegInstance;
      } catch (error) {
        lastLoadError = error;
        console.warn("[BiliFetch] ffmpeg core load failed", base, error);
      }
    }

    throw new Error(`ffmpeg.wasm 核心加载失败：${lastLoadError ? lastLoadError.message : "未知错误"}`);
  }

  async function cleanupFfmpegFiles(ffmpeg, names) {
    for (const name of names) {
      try {
        await ffmpeg.deleteFile(name);
      } catch (error) {
        console.warn("[BiliFetch] cleanup failed", name, error);
      }
    }
  }

  function exportMergeGuide(context, streams) {
    const video = streams.bestVideo;
    const audio = streams.bestAudio;
    const videoName = `${context.baseName}.video-${video ? makeVideoLabel(video) : "best"}.m4s`;
    const audioName = `${context.baseName}.audio-${audio ? makeAudioLabel(audio) : "best"}.m4s`;
    const outputName = `${context.baseName}.merged.mp4`;
    const text = [
      "BiliFetch 合并说明",
      "",
      "浏览器内自动合并失败或不可用时，可以在电脑端使用 ffmpeg 合并。",
      "",
      "步骤：",
      "1. 先把视频流和音频流下载到同一个文件夹。",
      "2. 文件名建议改成下面这两个：",
      `   ${videoName}`,
      `   ${audioName}`,
      "3. 在这个文件夹里打开命令行，执行：",
      "",
      `ffmpeg -i "${videoName}" -i "${audioName}" -c copy "${outputName}"`,
      "",
      "直链信息：",
      `视频流：${video ? video.url : "未获取到"}`,
      `音频流：${audio ? audio.url : "未获取到"}`,
      "",
      "说明：直链会过期，请尽快使用。请只下载自己有权保存和使用的内容。",
    ].join("\n");
    downloadText(`${context.baseName}.merge-guide.txt`, text, "text/plain;charset=utf-8");
  }

  async function exportAutomationPackage(context, streams, reason) {
    const report = buildCommandReport(context, streams, reason);
    await copyText(report);
    downloadText(`${context.baseName}.commands.txt`, report, "text/plain;charset=utf-8");
    appendStatus("已复制合并命令，并保存 .commands.txt；不会生成 bat。");
  }

  async function sendContextToLocalHelper(context, streams, reason) {
    if (!loadSettings().useLocalHelper) {
      return false;
    }

    const job = buildLocalHelperJob(context, streams, reason);
    if (!job) {
      return false;
    }

    appendStatus(`正在连接本地助手：${LOCAL_HELPER_URL}`);
    try {
      const result = await requestLocalHelper("/task", job);
      appendStatus(`本地助手已接收任务：${result.jobId || "已创建"}`);
      appendStatus(`输出目录：${result.downloadDir || "Windows 下载目录\\BiliFetch"}`);
      if (result.logFile) {
        appendStatus(`日志文件：${result.logFile}`);
      }
      if (result.progressUrl) {
        appendStatus(`进度页面：${result.progressUrl}`);
      }
      appendStatus("请保持本地助手窗口打开；下载和合并会在本机后台继续完成。");
      setProgress(100, "已交给本地助手自动处理");
      return true;
    } catch (error) {
      appendStatus(`本地助手未启动或连接失败：${error.message}`);
      appendStatus("将尝试浏览器内自动合并；不会生成 bat。想更稳更快，请先运行“启动BiliFetch本地助手.bat”。");
      return false;
    }
  }

  function buildLocalHelperJob(context, streams, reason) {
    const headers = {
      Referer: "https://www.bilibili.com/",
      Origin: "https://www.bilibili.com",
      "User-Agent": navigator.userAgent,
    };
    const base = {
      app: "BiliFetch",
      version: SCRIPT_VERSION,
      sourceUrl: location.href,
      title: context.view.title || context.baseName,
      baseName: context.baseName,
      bvid: context.bvid,
      cid: context.cid,
      quality: selectedQuality(),
      qualityLabel: qualityDisplayLabel(),
      qualityQn: selectedQualityQn(),
      reason: reason || "",
      headers,
      deleteTemp: true,
    };

    if (streams.durls.length) {
      return Object.assign({}, base, {
        kind: "download_files",
        items: streams.durls.map((item) => {
          const suffix = streams.durls.length > 1 ? `.part${String(item.order).padStart(2, "0")}` : "";
          return {
            role: "complete",
            filename: `${context.baseName}${suffix}.mp4`,
            urls: uniqueUrls([item.url]),
          };
        }),
      });
    }

    if (streams.bestVideo && streams.bestAudio) {
      return Object.assign({}, base, {
        kind: "merge_av",
        video: streamToLocalHelperItem(streams.bestVideo, `${context.baseName}.video-${makeVideoLabel(streams.bestVideo)}.m4s`, "video"),
        audio: streamToLocalHelperItem(streams.bestAudio, `${context.baseName}.audio-${makeAudioLabel(streams.bestAudio)}.m4s`, "audio"),
        output: {
          filename: `${context.baseName}.merged.mp4`,
        },
      });
    }

    return null;
  }

  function streamToLocalHelperItem(stream, filename, role) {
    return {
      role,
      filename,
      urls: uniqueUrls([stream && stream.url].concat((stream && stream.backupUrls) || [])),
    };
  }

  function requestLocalHelper(path, payload) {
    const url = `${LOCAL_HELPER_URL}${path}`;
    const data = stringifyAsciiJson(payload || {});

    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "POST",
          url,
          headers: {
            "Content-Type": "application/json;charset=utf-8",
          },
          data,
          responseType: "text",
          timeout: 6500,
          onload(response) {
            parseLocalHelperResponse(response.status, response.responseText, resolve, reject);
          },
          onerror() {
            reject(new Error("无法连接本地助手"));
          },
          ontimeout() {
            reject(new Error("连接本地助手超时"));
          },
        });
      });
    }

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
      body: data,
    }).then(async (response) => {
      const text = await response.text();
      return new Promise((resolve, reject) => parseLocalHelperResponse(response.status, text, resolve, reject));
    });
  }

  function parseLocalHelperResponse(status, text, resolve, reject) {
    let parsed = null;
    try {
      parsed = JSON.parse(text || "{}");
    } catch (error) {
      reject(new Error(`本地助手返回内容无法识别：${error.message}`));
      return;
    }

    if (status >= 200 && status < 300 && (parsed.ok || parsed.accepted)) {
      resolve(parsed);
      return;
    }

    reject(new Error(parsed.error || `本地助手返回 HTTP ${status}`));
  }

  function stringifyAsciiJson(value) {
    return JSON.stringify(value).replace(/[\u007f-\uffff]/g, (char) => {
      return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
    });
  }

  async function exportInfo(context) {
    const streams = collectStreams(context.playInfo);
    const payload = {
      exported_at: new Date().toISOString(),
      source_url: location.href,
      bvid: context.bvid,
      cid: context.cid,
      title: context.view.title || "",
      page: {
        page: context.page.page,
        part: context.page.part || "",
        cid: context.page.cid,
      },
      owner: context.view.owner || null,
      stat: context.view.stat || null,
      selected_streams: {
        quality_preference: selectedQuality(),
        quality_label: qualityDisplayLabel(),
        video: streams.bestVideo ? summarizeStream(streams.bestVideo) : null,
        audio: streams.bestAudio ? summarizeStream(streams.bestAudio) : null,
        complete_video_count: streams.durls.length,
      },
      raw_view: context.view,
    };
    downloadText(`${context.baseName}.info.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  function summarizeStream(stream) {
    return {
      id: stream.id || null,
      codecs: stream.codecs || "",
      width: stream.width || null,
      height: stream.height || null,
      bandwidth: stream.bandwidth || null,
      url: stream.url || "",
    };
  }

  async function exportCover(context) {
    const url = normalizeUrl(context.view.pic || "");
    if (!url) {
      appendStatus("没有找到封面地址。");
      return;
    }
    const ext = getExtensionFromUrl(url, "jpg");
    startRemoteDownload(url, `${context.baseName}.cover.${ext}`, "封面");
  }

  async function exportDanmaku(context) {
    appendStatus("读取弹幕...");
    const url = `https://comment.bilibili.com/${encodeURIComponent(context.cid)}.xml`;
    const xml = await requestText(url, { timeout: 25000 });
    if (!xml.trim()) {
      appendStatus("弹幕为空。");
      return;
    }

    downloadText(`${context.baseName}.danmaku.xml`, xml, "application/xml;charset=utf-8");

    const rows = parseDanmakuXml(xml);
    if (!rows.length) {
      appendStatus("弹幕 XML 已保存，但没有解析到普通弹幕行。");
      return;
    }

    downloadText(`${context.baseName}.danmaku.csv`, danmakuToCsv(rows), "text/csv;charset=utf-8");
    downloadText(`${context.baseName}.danmaku.txt`, danmakuToText(rows), "text/plain;charset=utf-8");
    downloadText(`${context.baseName}.danmaku.ass`, danmakuToAss(rows), "text/plain;charset=utf-8");
    appendStatus(`弹幕已保存：${rows.length} 条。`);
  }

  function parseDanmakuXml(xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    return Array.from(doc.querySelectorAll("d")).map((node) => {
      const parts = String(node.getAttribute("p") || "").split(",");
      return {
        time: Number(parts[0] || 0),
        mode: parts[1] || "",
        size: parts[2] || "",
        color: parts[3] || "",
        timestamp: parts[4] || "",
        pool: parts[5] || "",
        userHash: parts[6] || "",
        rowId: parts[7] || "",
        text: node.textContent || "",
      };
    });
  }

  function danmakuToCsv(rows) {
    const header = ["time", "mode", "size", "color", "timestamp", "pool", "userHash", "rowId", "text"];
    const lines = [header.join(",")];
    for (const row of rows) {
      lines.push(
        header
          .map((key) => {
            const value = row[key] == null ? "" : String(row[key]);
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(","),
      );
    }
    return `\uFEFF${lines.join("\n")}`;
  }

  function danmakuToText(rows) {
    return rows.map((row) => `[${formatShortTime(row.time)}] ${row.text}`).join("\n");
  }

  function danmakuToAss(rows) {
    const header = [
      "[Script Info]",
      "ScriptType: v4.00+",
      "PlayResX: 1920",
      "PlayResY: 1080",
      "",
      "[V4+ Styles]",
      "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
      "Style: Default,Arial,42,&H00FFFFFF,&H000000FF,&H00222222,&H66000000,0,0,0,0,100,100,0,0,1,2,0,8,20,20,30,1",
      "",
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ];
    const events = rows.map((row) => {
      const start = formatAssTime(row.time);
      const end = formatAssTime(row.time + 4);
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${escapeAssText(row.text)}`;
    });
    return header.concat(events).join("\n");
  }

  async function exportSubtitles(context) {
    const playerInfo = context.playerInfo || (await getPlayerInfo(context.bvid, context.cid).catch((error) => {
      appendStatus(`字幕信息读取失败：${error.message}`);
      return null;
    }));
    const subtitles = playerInfo && playerInfo.subtitle && Array.isArray(playerInfo.subtitle.subtitles)
      ? playerInfo.subtitle.subtitles
      : [];
    if (!subtitles.length) {
      appendStatus("没有找到字幕。");
      return;
    }

    for (let index = 0; index < subtitles.length; index += 1) {
      const subtitle = subtitles[index];
      const subtitleUrl = normalizeUrl(subtitle.subtitle_url || "");
      if (!subtitleUrl) {
        continue;
      }
      const label = sanitizeFilename(subtitle.lan_doc || subtitle.lan || `subtitle-${index + 1}`);
      appendStatus(`读取字幕：${label}`);
      const data = await requestJson(subtitleUrl, { timeout: 25000 });
      downloadText(`${context.baseName}.${label}.subtitle.json`, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
      if (Array.isArray(data.body)) {
        downloadText(`${context.baseName}.${label}.srt`, subtitleToSrt(data.body), "application/x-subrip;charset=utf-8");
      }
    }
    appendStatus(`字幕导出完成：${subtitles.length} 组。`);
  }

  function subtitleToSrt(items) {
    return items
      .map((item, index) => {
        const start = formatSrtTime(Number(item.from || 0));
        const end = formatSrtTime(Number(item.to || item.from || 0));
        const content = String(item.content || "").replace(/\r/g, "").trim();
        return `${index + 1}\n${start} --> ${end}\n${content}\n`;
      })
      .join("\n");
  }

  async function copyCommandReport(context) {
    const streams = collectStreams(context.playInfo);
    await exportAutomationPackage(context, streams, "用户选择命令模式");
  }

  function buildCommandReport(context, streams = collectStreams(context.playInfo), reason = "") {
    const lines = [
      "BiliFetch 命令模式",
      "",
      `标题：${context.view.title || ""}`,
      `页面：${location.href}`,
      `BV号：${context.bvid}`,
      `CID：${context.cid}`,
      `分P：${context.page.page || 1} ${context.page.part || ""}`.trim(),
      `清晰度：${qualityDisplayLabel()}`,
      `大小预估：${formatEstimate(estimateDownloadSize(context))}`,
      reason ? `自动处理原因：${reason}` : "",
      "",
      "说明：",
      "1. 直链会过期，请尽快使用。",
      "2. 本脚本不会生成 bat。",
      "3. 命令需要电脑上已经安装 aria2c 和 ffmpeg。",
      "4. 如果没有 aria2c，也可以把直链复制到其他下载工具。",
      "",
    ].filter(Boolean);

    if (streams.durls.length) {
      lines.push("完整视频下载命令：");
      streams.durls.forEach((item) => {
        const suffix = streams.durls.length > 1 ? `.part${String(item.order).padStart(2, "0")}` : "";
        const filename = `${context.baseName}${suffix}.mp4`;
        lines.push(buildAria2Command(item.url, filename));
      });
      return lines.join("\n");
    }

    const video = streams.bestVideo;
    const audio = streams.bestAudio;
    const videoName = `${context.baseName}.video-${video ? makeVideoLabel(video) : "best"}.m4s`;
    const audioName = `${context.baseName}.audio-${audio ? makeAudioLabel(audio) : "best"}.m4s`;
    const outputName = `${context.baseName}.merged.mp4`;

    lines.push("视频流下载命令：");
    lines.push(video ? buildAria2Command(video.url, videoName) : "未获取到视频流。");
    lines.push("");
    lines.push("音频流下载命令：");
    lines.push(audio ? buildAria2Command(audio.url, audioName) : "未获取到音频流。");
    lines.push("");
    lines.push("下载完成后的合并命令：");
    lines.push(buildFfmpegLocalCommand(videoName, audioName, outputName));
    lines.push("");
    lines.push("备用：ffmpeg 直接读取直链合并，失败时请改用上面的 aria2 下载后本地合并。");
    if (video && audio) {
      lines.push(buildFfmpegUrlCommand(video.url, audio.url, outputName));
    }
    return lines.join("\n");
  }

  function buildAria2Command(url, filename) {
    return `aria2c --referer="https://www.bilibili.com/" --header="Origin: https://www.bilibili.com" -o "${escapeCommandArg(filename)}" "${escapeCommandArg(url)}"`;
  }

  function buildFfmpegLocalCommand(videoName, audioName, outputName) {
    return `ffmpeg -i "${escapeCommandArg(videoName)}" -i "${escapeCommandArg(audioName)}" -c copy "${escapeCommandArg(outputName)}"`;
  }

  function buildFfmpegUrlCommand(videoUrl, audioUrl, outputName) {
    const headers = "Referer: https://www.bilibili.com/\\r\\nOrigin: https://www.bilibili.com\\r\\n";
    return `ffmpeg -headers "${headers}" -i "${escapeCommandArg(videoUrl)}" -headers "${headers}" -i "${escapeCommandArg(audioUrl)}" -c copy "${escapeCommandArg(outputName)}"`;
  }

  function escapeCommandArg(value) {
    return String(value || "").replace(/"/g, '\\"');
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function copyLinkReport(context) {
    const streams = collectStreams(context.playInfo);
    const subtitleLines = [];
    const subtitles = context.playerInfo && context.playerInfo.subtitle && Array.isArray(context.playerInfo.subtitle.subtitles)
      ? context.playerInfo.subtitle.subtitles
      : [];

    subtitles.forEach((subtitle, index) => {
      subtitleLines.push(`字幕${index + 1}(${subtitle.lan_doc || subtitle.lan || "unknown"}): ${normalizeUrl(subtitle.subtitle_url || "")}`);
    });

    const lines = [
      "BiliFetch 链接信息",
      `标题: ${context.view.title || ""}`,
      `页面: ${location.href}`,
      `BV号: ${context.bvid}`,
      `CID: ${context.cid}`,
      `分P: ${context.page.page || 1} ${context.page.part || ""}`.trim(),
      `清晰度: ${qualityDisplayLabel()}`,
      `封面: ${normalizeUrl(context.view.pic || "")}`,
      `弹幕XML: https://comment.bilibili.com/${context.cid}.xml`,
    ];

    if (streams.durls.length) {
      streams.durls.forEach((item) => lines.push(`完整视频${item.order}: ${item.url}`));
    }
    if (streams.bestVideo) {
      lines.push(`所选视频流(${makeVideoLabel(streams.bestVideo)}): ${streams.bestVideo.url}`);
    }
    if (streams.bestAudio) {
      lines.push(`最高音频(${makeAudioLabel(streams.bestAudio)}): ${streams.bestAudio.url}`);
    }
    lines.push(...subtitleLines);
    lines.push("");
    lines.push("提示: 浏览器内自动合并依赖 ffmpeg.wasm，失败时可用合并说明里的 ffmpeg 命令。");

    await copyText(lines.join("\n"));
    appendStatus("已复制视频信息和可用直链。");
  }

  async function copyDiagnostics() {
    const suggestions = lastError ? diagnoseError(lastError) : [];
    const payload = {
      name: "BiliFetch ScriptCat diagnostics",
      version: SCRIPT_VERSION,
      time: new Date().toISOString(),
      url: location.href,
      userAgent: navigator.userAgent,
      bvid: safeCall(getBvid),
      modes: selectedModes(),
      selectedPageKeys: getCheckedPageKeys(),
      quality: selectedQuality(),
      qualityLabel: qualityDisplayLabel(),
      qualityQn: selectedQualityQn(),
      settings: loadSettings(),
      hasGMDownload: typeof GM_download === "function",
      hasGMXmlhttpRequest: typeof GM_xmlhttpRequest === "function",
      hasGMClipboard: typeof GM_setClipboard === "function",
      hasFFmpegWasm: Boolean(pageWindow.FFmpegWASM && pageWindow.FFmpegWASM.FFmpeg),
      hasFFmpegUtil: Boolean(pageWindow.FFmpegUtil && pageWindow.FFmpegUtil.toBlobURL),
      lastError,
      suggestions,
      recentStatus: lastDiagnostics,
    };
    await copyText(JSON.stringify(payload, null, 2));
    setStatus("诊断信息已复制。你可以把剪贴板内容发给作者排查。");
    setProgress(100, "诊断已复制");
  }

  function safeCall(fn) {
    try {
      return fn();
    } catch (error) {
      return `读取失败：${error.message}`;
    }
  }

  function downloadText(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
    downloadBlob(filename, blob);
  }

  function downloadBlob(filename, blob) {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = sanitizeDownloadFilename(filename);
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    appendStatus(`已保存：${anchor.download}`);
  }

  async function copyText(text) {
    if (typeof GM_setClipboard === "function") {
      GM_setClipboard(text, "text");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function normalizeUrl(url) {
    if (!url) {
      return "";
    }
    if (url.startsWith("//")) {
      return `https:${url}`;
    }
    try {
      return new URL(url, location.href).toString();
    } catch (error) {
      return url;
    }
  }

  function getExtensionFromUrl(url, fallback) {
    try {
      const pathname = new URL(url).pathname.toLowerCase();
      const match = pathname.match(/\.([a-z0-9]{2,5})$/);
      if (match) {
        return match[1];
      }
    } catch (error) {
      console.warn("[BiliFetch] cannot read extension", error);
    }
    return fallback;
  }

  function formatSrtTime(seconds) {
    const totalMs = Math.max(0, Math.round(seconds * 1000));
    const ms = totalMs % 1000;
    const totalSeconds = Math.floor(totalMs / 1000);
    const s = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const m = totalMinutes % 60;
    const h = Math.floor(totalMinutes / 60);
    return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, "0")}`;
  }

  function formatAssTime(seconds) {
    const totalCs = Math.max(0, Math.round(seconds * 100));
    const cs = totalCs % 100;
    const totalSeconds = Math.floor(totalCs / 100);
    const s = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const m = totalMinutes % 60;
    const h = Math.floor(totalMinutes / 60);
    return `${h}:${pad(m)}:${pad(s)}.${String(cs).padStart(2, "0")}`;
  }

  function formatShortTime(seconds) {
    const totalSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
    const s = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const m = totalMinutes % 60;
    const h = Math.floor(totalMinutes / 60);
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function escapeAssText(value) {
    return String(value || "").replace(/[{}]/g, "").replace(/\n/g, "\\N");
  }

  function labelOf(items, value) {
    const item = items.find(([itemValue]) => itemValue === value);
    return item ? item[1] : value;
  }

  if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("打开 BiliFetch 面板", installPanel);
    GM_registerMenuCommand("打开 BiliFetch 设置", openSettingsPanel);
    GM_registerMenuCommand("查看 BiliFetch 更新日志", () => showChangelog(true));
    GM_registerMenuCommand("复制 BiliFetch 诊断", () => copyDiagnostics().catch(showError));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installPanel, { once: true });
  } else {
    installPanel();
  }
})();
