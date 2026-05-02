// ============================================================
// content.js v3.4 — Phương án B: Tab Workspace Riêng
//
// Thay đổi chính so với v3.3:
//   - Storage namespace riêng: projectTree_claude / _gemini / _chatgpt
//   - Sidebar có 3 tab, tự active đúng site khi load
//   - activeTab có thể khác SITE (user tự chuyển tab xem)
//   - Mọi CRUD/render đều đọc/ghi theo activeTab, không phải SITE cứng
//   - Export/Import gộp cả 3 namespace vào 1 file backup
// ============================================================

// ── Platform hiện tại (trang đang mở) ──
const SITE = window.location.hostname.includes('gemini')
  ? 'gemini'
  : window.location.hostname.includes('claude')
  ? 'claude'
  : 'chatgpt';

// ── Tab đang được xem trong sidebar (mặc định = trang hiện tại) ──
let activeTab = SITE;

// ── Detect xem URL hiện tại có phải 1 chat cụ thể không ──
// Claude:   /chat/uuid
// Gemini:   /app/uuid  hoặc  /u/0/app/uuid
// ChatGPT:  /c/uuid
const CHAT_URL_PATTERNS = {
  claude:  /\/chat\/[a-zA-Z0-9-]+/,
  gemini:  /\/(u\/\d+\/)?app\/[a-zA-Z0-9]+/,
  chatgpt: /\/c\/[a-zA-Z0-9-]+/,
};

function isInChatPage() {
  const pattern = CHAT_URL_PATTERNS[SITE];
  return pattern ? pattern.test(window.location.pathname) : true;
}

// ── Storage key theo namespace ──
const TREE_KEY = site => `projectTree_${site}`;
const SNAP_KEY = site => `snapshots_${site}`;

// ── Màu accent theo platform ──
const SITE_COLOR = {
  claude:  '#a78bfa',
  gemini:  '#1D9E75',
  chatgpt: '#D85A30',
};
const SITE_LABEL = {
  claude:  'Claude',
  gemini:  'Gemini',
  chatgpt: 'ChatGPT',
};

// ============================================================
// INPUT SELECTOR CHAIN
// ============================================================
const INPUT_SELECTOR_CHAIN = {
  chatgpt: [
    'div[contenteditable="true"][data-lexical-editor]',
    '#prompt-textarea',
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"]',
  ],
  claude: [
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"]',
  ],
  gemini: [
    'rich-textarea',
    'div[contenteditable="true"]',
  ],
};

// ============================================================
// KHỞI TẠO
// ============================================================
function waitForBody() {
  if (document.body) { initSidebar(); return; }
  const obs = new MutationObserver(() => {
    if (document.body) { obs.disconnect(); initSidebar(); }
  });
  obs.observe(document.documentElement, { childList: true });
}

function initSidebar() {
  if (document.getElementById('aipo-sidebar')) return;

  const sidebar = document.createElement('div');
  sidebar.id = 'aipo-sidebar';
  sidebar.innerHTML = `
    <div class="aipo-header">
      <span class="aipo-logo">⬡ AIPO</span>

      <div class="aipo-tabs" id="aipo-tabs">
        <button class="aipo-tab" data-site="claude"  title="Workspace Claude">Claude</button>
        <button class="aipo-tab" data-site="gemini"  title="Workspace Gemini">Gemini</button>
        <button class="aipo-tab" data-site="chatgpt" title="Workspace ChatGPT">GPT</button>
      </div>

      <input type="text" id="aipo-search" placeholder="Tìm trong workspace..." autocomplete="off">
      <div class="aipo-header-btns">
        <button id="aipo-add-folder" title="Thêm thư mục mới">📁</button>
        <button id="aipo-add-chat"   title="Gán chat đang mở vào thư mục">💬+</button>
      </div>
    </div>

    <div id="aipo-tree"></div>

    <!-- SNAPSHOT PANEL — ẩn mặc định, hiện khi bấm 📸 -->
    <div id="aipo-snap-panel" class="aipo-snap-panel aipo-hidden">
      <div class="aipo-snap-panel-header">
        <span class="aipo-snap-title">📸 Lưu Snapshot</span>
        <button id="aipo-snap-close" title="Đóng">✕</button>
      </div>
      <div class="aipo-snap-step">
        <span class="aipo-snap-step-num">1</span>
        <span>AI đã nhận lệnh tóm tắt ở trên. Copy toàn bộ response của AI.</span>
      </div>
      <div class="aipo-snap-step">
        <span class="aipo-snap-step-num">2</span>
        <span>Paste vào đây rồi nhấn Lưu:</span>
      </div>
      <textarea id="aipo-snap-input" placeholder="Dán nội dung tóm tắt của AI vào đây..." rows="6"></textarea>
      <div class="aipo-btn-row" style="margin-top:6px">
        <button id="aipo-snap-save"   class="aipo-btn-primary">💾 Lưu Snapshot</button>
        <button id="aipo-snap-cancel" class="aipo-btn-secondary">Huỷ</button>
      </div>
    </div>

    <div class="aipo-footer">
      <div class="aipo-btn-row">
        <button id="aipo-snapshot" class="aipo-btn-primary">📸 Snapshot</button>
        <button id="aipo-resume"   class="aipo-btn-secondary">🚀 Resume</button>
      </div>
      <div class="aipo-btn-row">
        <button id="aipo-export" class="aipo-btn-icon" title="Export — lưu file backup">💾 Export</button>
        <button id="aipo-import" class="aipo-btn-icon" title="Import — khôi phục từ file">📂 Import</button>
      </div>
    </div>

    <div id="aipo-toast"></div>
  `;
  document.body.appendChild(sidebar);

  // Toggle button
  const toggle = document.createElement('button');
  toggle.id = 'aipo-toggle';
  toggle.title = 'Toggle Sidebar';
  toggle.innerHTML = '⬡';
  toggle.onclick = toggleSidebar;
  document.body.appendChild(toggle);

  setActiveTab(SITE);   // auto-focus đúng tab trang hiện tại
  attachEvents();
  runCompatibilityCheck();
  updateChatPageState();  // cập nhật trạng thái nút theo URL hiện tại
  watchUrlChanges();      // theo dõi URL thay đổi (SPA navigation)
}

// Theo dõi URL thay đổi trên SPA (Claude/Gemini/ChatGPT đều là SPA)
function watchUrlChanges() {
  let lastUrl = window.location.href;
  const obs   = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      updateChatPageState();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

// Cập nhật trạng thái sidebar theo URL hiện tại
function updateChatPageState() {
  const inChat  = isInChatPage();
  const addBtn  = document.getElementById('aipo-add-chat');
  const sidebar = document.getElementById('aipo-sidebar');
  if (!addBtn || !sidebar) return;

  if (inChat) {
    // Đang trong chat → nút bình thường
    addBtn.disabled = false;
    addBtn.title    = 'Gán chat đang mở vào thư mục';
    addBtn.style.opacity = '1';
    // Nếu sidebar đang ẩn do trang list → hiện lại
    sidebar.classList.remove('aipo-list-page');
  } else {
    // Đang ở trang danh sách (không phải chat cụ thể)
    addBtn.disabled = true;
    addBtn.title    = `Hãy mở 1 đoạn chat ${SITE_LABEL[SITE]} trước, rồi nhấn 💬+ để gán`;
    addBtn.style.opacity = '0.4';
    // Thu sidebar lại để không che sidebar gốc của Claude
    if (SITE === 'claude') sidebar.classList.add('aipo-list-page');
  }
}

// ============================================================
// TAB MANAGEMENT
// ============================================================
function setActiveTab(site) {
  activeTab = site;

  // Cập nhật visual tab active
  document.querySelectorAll('.aipo-tab').forEach(btn => {
    const isActive = btn.dataset.site === site;
    btn.classList.toggle('aipo-tab-active', isActive);
    // Màu accent theo platform
    btn.style.borderBottomColor = isActive ? SITE_COLOR[site] : 'transparent';
    btn.style.color = isActive ? SITE_COLOR[site] : '';
  });

  // Cập nhật badge "đang xem workspace khác"
  updateWorkspaceBadge();

  // Clear search khi chuyển tab
  const search = document.getElementById('aipo-search');
  if (search) search.value = '';

  renderTree();
}

function updateWorkspaceBadge() {
  // Nếu đang xem workspace khác site hiện tại → hiện warning nhỏ
  const existing = document.getElementById('aipo-workspace-note');
  if (existing) existing.remove();

  if (activeTab !== SITE) {
    const note = document.createElement('div');
    note.id = 'aipo-workspace-note';
    note.className = 'aipo-workspace-note';
    note.innerHTML =
      `👁 Đang xem workspace <strong>${SITE_LABEL[activeTab]}</strong>` +
      ` · <span id="aipo-back-to-site" style="cursor:pointer;text-decoration:underline">` +
      `Về ${SITE_LABEL[SITE]}</span>`;
    // Chèn sau tabs
    const tabs = document.getElementById('aipo-tabs');
    tabs.parentNode.insertBefore(note, tabs.nextSibling);

    document.getElementById('aipo-back-to-site')
      .addEventListener('click', () => setActiveTab(SITE));
  }
}

// ============================================================
// TOGGLE SIDEBAR
// ============================================================
function toggleSidebar() {
  const sidebar = document.getElementById('aipo-sidebar');
  const toggle  = document.getElementById('aipo-toggle');
  const hidden  = sidebar.classList.toggle('aipo-hidden');
  toggle.classList.toggle('aipo-toggle-active', !hidden);
}

// ============================================================
// SHADOW DOM (Gemini)
// ============================================================
function getInputFromShadowHost(hostSelector) {
  const host = document.querySelector(hostSelector);
  if (!host) return null;
  if (host.shadowRoot) {
    const inner = host.shadowRoot.querySelector('div[contenteditable="true"]')
                || host.shadowRoot.querySelector('textarea');
    if (inner) return inner;
  }
  for (const child of host.querySelectorAll('*')) {
    if (child.shadowRoot) {
      const inner = child.shadowRoot.querySelector('div[contenteditable="true"]')
                  || child.shadowRoot.querySelector('textarea');
      if (inner) return inner;
    }
  }
  return null;
}

function findInputElement() {
  const chain = INPUT_SELECTOR_CHAIN[SITE] || INPUT_SELECTOR_CHAIN.chatgpt;
  for (const selector of chain) {
    if (selector === 'rich-textarea') {
      const el = getInputFromShadowHost('rich-textarea');
      if (el) return el;
      continue;
    }
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function triggerFrameworkUpdate(el, text) {
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    const proto  = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, text);
  } else if (el.contentEditable === 'true') {
    el.innerHTML = '';
    el.appendChild(document.createTextNode(text));
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  }
  el.dispatchEvent(new Event('focus', { bubbles: true }));
  el.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true, cancelable: true, inputType: 'insertText', data: text,
  }));
  el.dispatchEvent(new InputEvent('input', {
    bubbles: true, cancelable: true, inputType: 'insertText', data: text,
  }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
}

function injectText(text) {
  const input = findInputElement();
  if (!input) {
    showToast('⚠️ Không tìm thấy ô nhập liệu!');
    console.warn('[AIPO] injectText: không tìm thấy input trên', SITE);
    return false;
  }
  input.focus();
  if (input.contentEditable === 'true') {
    input.textContent = text;
    const range = document.createRange();
    range.selectNodeContents(input);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  } else {
    triggerFrameworkUpdate(input, text);
  }
  return true;
}

function runCompatibilityCheck() {
  setTimeout(() => {
    const input = findInputElement();
    if (input) {
      console.info('[AIPO] ✅ Input found on', SITE, '→',
        input.tagName, input.id || input.className?.slice(0, 50));
    } else {
      console.warn('[AIPO] ⚠️ Input NOT found on', SITE);
    }
  }, 3000);
}

// ============================================================
// STORAGE HELPERS — đọc/ghi theo activeTab namespace
// Wrap try/catch để handle "Extension context invalidated"
// (xảy ra khi extension reload trong lúc tab vẫn mở)
// ============================================================
async function getTree(site = activeTab) {
  try {
    const key  = TREE_KEY(site);
    const data = await chrome.storage.local.get(key);
    return data[key] || [];
  } catch (e) {
    handleContextInvalidated(e);
    return [];
  }
}

async function setTree(tree, site = activeTab) {
  try {
    await chrome.storage.local.set({ [TREE_KEY(site)]: tree });
  } catch (e) {
    handleContextInvalidated(e);
  }
}

async function getSnaps(site = activeTab) {
  try {
    const key  = SNAP_KEY(site);
    const data = await chrome.storage.local.get(key);
    return data[key] || [];
  } catch (e) {
    handleContextInvalidated(e);
    return [];
  }
}

async function setSnaps(snaps, site = activeTab) {
  try {
    await chrome.storage.local.set({ [SNAP_KEY(site)]: snaps });
  } catch (e) {
    handleContextInvalidated(e);
  }
}

// Khi context bị invalidated → hiện banner nhắc reload tab
function handleContextInvalidated(err) {
  if (!err?.message?.includes('invalidated')) return;
  // Tránh hiện nhiều lần
  if (document.getElementById('aipo-reload-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'aipo-reload-banner';
  banner.innerHTML = `
    ⚠️ Extension vừa được cập nhật.
    <span id="aipo-reload-btn"
      style="text-decoration:underline;cursor:pointer;margin-left:6px;font-weight:600;">
      Reload tab để tiếp tục →
    </span>
  `;
  banner.style.cssText = `
    position:fixed; top:0; left:0; right:0; z-index:2147483647;
    background:#7c3aed; color:#fff; font-size:12px;
    padding:8px 16px; text-align:center;
    font-family:'Segoe UI',system-ui,sans-serif;
  `;
  document.body.appendChild(banner);
  document.getElementById('aipo-reload-btn')
    .addEventListener('click', () => window.location.reload());
}

// ============================================================
// [C1] GÁN CHAT HIỆN TẠI — chỉ gán vào workspace của SITE
// ============================================================
async function assignCurrentChat() {
  // Guard: phải đang trong 1 chat cụ thể mới gán được
  if (!isInChatPage()) {
    showToast(`⚠️ Hãy mở 1 đoạn chat ${SITE_LABEL[SITE]} trước rồi nhấn 💬+`);
    return;
  }
  // Nếu đang xem tab khác → tự chuyển về SITE trước khi gán
  if (activeTab !== SITE) {
    setActiveTab(SITE);
    showToast(`ℹ️ Đã chuyển về workspace ${SITE_LABEL[SITE]} để gán chat`);
    await new Promise(r => setTimeout(r, 300));
  }

  const tree    = await getTree(SITE);
  const folders = tree.filter(n => n.type === 'folder');

  if (folders.length === 0) {
    showToast('⚠️ Chưa có thư mục. Nhấn 📁 để tạo trước!');
    return;
  }

  const currentUrl = window.location.href;
  const existing   = tree.find(n => n.type === 'chat' && n.url === currentUrl);
  if (existing) {
    showToast(`ℹ️ Chat đã có trong "${getFolderName(tree, existing.parentId)}"`);
    return;
  }

  const folderId = await pickFolder(folders);
  if (!folderId) return;

  const defaultName = sanitizeChatTitle(document.title || 'Chat không tên');
  const chatName    = prompt('Đặt tên cho chat này:', defaultName);
  if (!chatName?.trim()) return;

  tree.push({
    id:        `chat_${Date.now()}`,
    parentId:  folderId,
    type:      'chat',
    name:      chatName.trim(),
    url:       currentUrl,
    site:      SITE,
    snapshot:  null,
    status:    'active',
    createdAt: new Date().toISOString(),
  });

  await setTree(tree, SITE);
  renderTree();
  showToast(`✅ Đã gán vào "${getFolderName(tree, folderId)}"`);
}

async function pickFolder(folders) {
  const list  = folders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
  const input = prompt(`Chọn thư mục đích (nhập số):\n\n${list}`);
  const idx   = parseInt(input) - 1;
  if (isNaN(idx) || !folders[idx]) return null;
  return folders[idx].id;
}

function sanitizeChatTitle(title) {
  return title
    .replace(/^(New chat|Chat mới|Untitled)$/i, '')
    .replace(/\s*[-|]\s*(Claude|ChatGPT|Gemini).*/i, '')
    .trim() || 'Chat ' + new Date().toLocaleDateString('vi-VN');
}

function getFolderName(tree, folderId) {
  return tree.find(n => n.id === folderId)?.name || 'Unknown';
}

// ============================================================
// [C2] URL CHẾT — Re-link hoặc Resume
// ============================================================
async function openChatNode(node) {
  if (node.status === 'dead') { handleDeadChat(node); return; }
  window.location.href = node.url;
}

async function handleDeadChat(node) {
  const tree   = await getTree();
  const choice = confirm(
    `⚠️ Chat "${node.name}" không còn truy cập được.\n\n` +
    `• OK  → Re-link: gán URL hiện tại vào chat này\n` +
    `• Huỷ → Resume: inject snapshot vào chat đang mở`
  );
  if (choice) {
    const updated = tree.map(n =>
      n.id === node.id
        ? { ...n, url: window.location.href, status: 'migrated', site: SITE }
        : n
    );
    await setTree(updated);
    renderTree();
    showToast(`🔗 Đã re-link "${node.name}"`);
  } else {
    if (node.snapshot) {
      injectText(`[RESUME - "${node.name}"]\n\n${node.snapshot}`);
      showToast('🚀 Đã inject snapshot!');
    } else {
      showToast('⚠️ Chat này chưa có snapshot.');
    }
  }
}

// ============================================================
// [C3] SEARCH trong workspace activeTab
// ============================================================
function searchTree(tree, query) {
  if (!query) return tree;
  const q = query.toLowerCase();
  const matchIds = new Set();
  tree.forEach(n => {
    if (n.name?.toLowerCase().includes(q) ||
        n.snapshot?.toLowerCase().includes(q)) {
      matchIds.add(n.id);
    }
  });
  const withParents = new Set(matchIds);
  tree.forEach(n => {
    if (matchIds.has(n.id) && n.parentId) {
      withParents.add(n.parentId);
      const parent = tree.find(p => p.id === n.parentId);
      if (parent?.parentId) withParents.add(parent.parentId);
    }
  });
  return tree.filter(n => withParents.has(n.id));
}

// ============================================================
// RENDER CÂY — đọc từ namespace của activeTab
// ============================================================

// Lưu trạng thái thu gọn trong memory (reset khi reload tab)
// key = folder id, value = true (thu gọn) / false (mở rộng)
const collapsedFolders = {};

async function renderTree(filter = '') {
  const tree      = await getTree(activeTab);
  const container = document.getElementById('aipo-tree');
  if (!container) return;
  container.innerHTML = '';

  const accentColor = SITE_COLOR[activeTab];
  const filtered    = searchTree(tree, filter);

  if (tree.length === 0) {
    container.innerHTML = `
      <div class="aipo-empty">
        <div class="aipo-empty-icon">📂</div>
        <p>Workspace <strong>${SITE_LABEL[activeTab]}</strong> trống.<br>
        ${activeTab === SITE
          ? 'Nhấn 📁 để tạo thư mục đầu tiên.'
          : `Mở ${SITE_LABEL[activeTab]} để bắt đầu.`}
        </p>
      </div>`;
    return;
  }

  if (filtered.length === 0 && filter) {
    container.innerHTML = `
      <div class="aipo-empty">
        <div class="aipo-empty-icon">🔍</div>
        <p>Không có kết quả cho<br><strong>${filter}</strong></p>
      </div>`;
    return;
  }

  const drawNodes = (parentId, level = 0) => {
    filtered.filter(n => n.parentId === parentId).forEach(node => {
      const isFolder    = node.type === 'folder';
      const isCollapsed = isFolder && collapsedFolders[node.id] === true;
      const childCount  = isFolder
        ? tree.filter(n => n.parentId === node.id).length
        : 0;

      const div = document.createElement('div');
      div.className = `aipo-node aipo-${node.type}`;
      if (node.status === 'dead')                          div.classList.add('aipo-dead');
      if (activeTab === SITE && node.url === window.location.href)
        div.classList.add('aipo-current');
      if (isCollapsed) div.classList.add('aipo-collapsed');
      div.style.paddingLeft = `${level * 14 + 10}px`;
      div.dataset.id   = node.id;
      div.dataset.type = node.type;

      let icon = isFolder ? (isCollapsed ? '📁' : '📂') : '📄';
      if (node.status === 'dead')                     icon = '💀';
      else if (node.status === 'migrated')            icon = '🔗';
      else if (!isFolder && node.snapshot)            icon = '📸';

      // Badge số chat con (chỉ khi thu gọn và có con)
      const collapseBadge = isFolder && childCount > 0
        ? `<span class="aipo-child-count">${childCount}</span>`
        : '';

      // Mũi tên toggle — chỉ hiện với folder có con
      const toggleArrow = isFolder && childCount > 0
        ? `<span class="aipo-toggle-arrow ${isCollapsed ? '' : 'aipo-arrow-open'}"
             data-id="${node.id}">›</span>`
        : `<span class="aipo-toggle-arrow-placeholder"></span>`;

      div.innerHTML = `
        ${toggleArrow}
        <span class="aipo-node-icon">${icon}</span>
        <span class="aipo-node-name" title="${node.name}">${node.name}</span>
        ${node.snapshot ? `<span class="aipo-snap-dot" style="color:${accentColor}" title="Có snapshot">●</span>` : ''}
        ${collapseBadge}
        <div class="aipo-node-actions">
          ${isFolder
            ? `<button class="aipo-btn-add-sub" data-id="${node.id}" title="Thêm thư mục con">＋</button>`
            : ''}
          ${node.status === 'dead'
            ? `<button class="aipo-btn-relink" data-id="${node.id}" title="Re-link">🔗</button>`
            : ''}
          <button class="aipo-btn-del" data-id="${node.id}" data-type="${node.type}"
            title="${isFolder ? 'Xóa thư mục' : 'Gỡ khỏi thư mục'}">✕</button>
        </div>
      `;

      container.appendChild(div);

      // Chỉ vẽ con nếu folder đang mở rộng (và không đang search)
      if (isFolder && !isCollapsed) drawNodes(node.id, level + 1);

      // Khi search → bỏ qua collapsed state, luôn hiện kết quả
      if (isFolder && filter) drawNodes(node.id, level + 1);
    });
  };
  drawNodes(null);
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function attachEvents() {
  // Tab switching
  document.getElementById('aipo-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.aipo-tab');
    if (tab) setActiveTab(tab.dataset.site);
  });

  document.getElementById('aipo-search').addEventListener('input', e => {
    renderTree(e.target.value.trim());
  });

  document.getElementById('aipo-add-folder').addEventListener('click', () => {
    promptAndCreate(null, 'folder');
  });
  document.getElementById('aipo-add-chat').addEventListener('click', assignCurrentChat);
  document.getElementById('aipo-snapshot').addEventListener('click', handleSnapshot);
  document.getElementById('aipo-resume').addEventListener('click', handleResume);

  // Snapshot panel events
  document.getElementById('aipo-snap-close').addEventListener('click', closeSnapPanel);
  document.getElementById('aipo-snap-cancel').addEventListener('click', closeSnapPanel);
  document.getElementById('aipo-snap-save').addEventListener('click', saveSnapshotContent);

  document.getElementById('aipo-export').addEventListener('click', () => handleLocalSync('export'));
  document.getElementById('aipo-import').addEventListener('click', () => handleLocalSync('import'));

  // Event delegation cho tree
  document.getElementById('aipo-tree').addEventListener('click', async e => {
    const toggleEl = e.target.closest('.aipo-toggle-arrow');
    const addSub   = e.target.closest('.aipo-btn-add-sub');
    const delBtn   = e.target.closest('.aipo-btn-del');
    const relink   = e.target.closest('.aipo-btn-relink');
    const nodeEl   = e.target.closest('.aipo-node');

    // Toggle collapse/expand folder
    if (toggleEl) {
      e.stopPropagation();
      const folderId = toggleEl.dataset.id;
      collapsedFolders[folderId] = !collapsedFolders[folderId];
      renderTree(document.getElementById('aipo-search').value.trim());
      return;
    }

    if (addSub) { e.stopPropagation(); promptAndCreate(addSub.dataset.id, 'folder'); return; }
    if (delBtn) { e.stopPropagation(); await deleteNode(delBtn.dataset.id); return; }
    if (relink) {
      e.stopPropagation();
      const tree = await getTree();
      const node = tree.find(n => n.id === relink.dataset.id);
      if (node) await handleDeadChat(node);
      return;
    }
    if (nodeEl?.dataset.type === 'chat' && !e.target.closest('.aipo-node-actions')) {
      const tree = await getTree();
      const node = tree.find(n => n.id === nodeEl.dataset.id);
      if (node) await openChatNode(node);
    }
  });
}

// ============================================================
// CRUD — đọc/ghi theo activeTab
// ============================================================
async function promptAndCreate(parentId, type) {
  // Chỉ cho tạo thư mục trong workspace hiện tại (SITE)
  // Nếu đang xem tab khác thì cũng tạo vào activeTab nhưng cảnh báo
  const name = prompt(type === 'folder' ? 'Tên thư mục mới:' : 'Tên ghi chú:');
  if (!name?.trim()) return;

  const tree = await getTree(activeTab);
  tree.push({
    id:        `node_${Date.now()}`,
    parentId:  parentId || null,
    type,
    name:      name.trim(),
    url:       null,
    site:      activeTab,
    snapshot:  null,
    status:    'active',
    createdAt: new Date().toISOString(),
  });
  await setTree(tree, activeTab);
  renderTree();
  showToast(`✅ Đã tạo "${name.trim()}" trong workspace ${SITE_LABEL[activeTab]}`);
}

async function deleteNode(id) {
  const tree = await getTree(activeTab);
  const node = tree.find(n => n.id === id);
  if (!node) return;

  if (node.type === 'folder') {
    // Xóa thư mục → cảnh báo rõ sẽ xóa cả chat bookmark bên trong
    const childChats = tree.filter(n => n.parentId === id && n.type === 'chat').length;
    const msg = childChats > 0
      ? `Xóa thư mục "${node.name}" và gỡ ${childChats} chat bookmark bên trong?\n\n(Chat thật trên ${SITE_LABEL[activeTab]} vẫn còn nguyên)`
      : `Xóa thư mục "${node.name}"?`;
    if (!confirm(msg)) return;

    // Xóa đệ quy toàn bộ node con
    const toDelete = new Set();
    const collect  = nid => {
      toDelete.add(nid);
      tree.filter(n => n.parentId === nid).forEach(n => collect(n.id));
    };
    collect(id);
    await setTree(tree.filter(n => !toDelete.has(n.id)), activeTab);
    showToast('🗑️ Đã xóa thư mục');

  } else {
    // Gỡ chat bookmark — KHÔNG xóa chat thật
    if (!confirm(
      `Gỡ "${node.name}" khỏi thư mục?\n\n` +
      `Chat thật trên ${SITE_LABEL[activeTab]} vẫn còn nguyên, chỉ xóa bookmark này.`
    )) return;
    await setTree(tree.filter(n => n.id !== id), activeTab);
    showToast('📌 Đã gỡ bookmark khỏi thư mục');
  }

  renderTree();
}

// ============================================================
// SNAPSHOT 2 BƯỚC — luôn theo SITE (trang đang mở)
//
// Bước 1 (handleSnapshot): inject prompt → AI tóm tắt → mở panel
// Bước 2 (saveSnapshotContent): user paste response → lưu vào storage
//
// Lý do cần 2 bước: extension không đọc được response DOM của AI
// (bất đồng bộ, selector thay đổi liên tục). User tự copy/paste
// là cách duy nhất đáng tin cậy trên cả 3 platform.
// ============================================================

// URL đang chờ snapshot (lưu tạm khi mở panel)
let _pendingSnapshotUrl = null;

async function handleSnapshot() {
  const snapshotPrompt =
    'Hãy tóm tắt phiên làm việc này theo 3 phần: ' +
    '(1) Tiến độ - đã làm được gì, ' +
    '(2) Biến số quan trọng - quyết định và số liệu cốt lõi, ' +
    '(3) Bước tiếp theo - việc cần làm ngay. ' +
    'Tối đa 200 từ.';

  const ok = injectText(snapshotPrompt);
  if (!ok) return;

  // Lưu URL để bước 2 gán đúng chat node
  _pendingSnapshotUrl = window.location.href;

  // KHÔNG tự mở panel — user cần nhấn Send trước, đợi AI trả lời,
  // rồi tự bấm nút "📋 Lưu response AI" mới hiện panel
  showSnapWaitingState();
  showToast('📸 Đã inject prompt! Nhấn Send → chờ AI → bấm "Lưu response AI".');
}

// Hiện trạng thái chờ: nút Snapshot đổi thành "📋 Lưu response AI"
function showSnapWaitingState() {
  const btn = document.getElementById('aipo-snapshot');
  btn.textContent = '📋 Lưu response AI';
  btn.classList.add('aipo-btn-waiting');
  // Đổi handler tạm thời
  btn.onclick = () => {
    openSnapPanel();
    // Khôi phục nút sau khi panel mở
    btn.textContent = '📸 Snapshot';
    btn.classList.remove('aipo-btn-waiting');
    btn.onclick = null;
    btn.addEventListener('click', handleSnapshot);
  };
}

function openSnapPanel() {
  const panel  = document.getElementById('aipo-snap-panel');
  const tree   = document.getElementById('aipo-tree');
  const input  = document.getElementById('aipo-snap-input');
  panel.classList.remove('aipo-hidden');
  tree.classList.add('aipo-hidden');
  input.value = '';
  input.focus();
}

function closeSnapPanel() {
  document.getElementById('aipo-snap-panel').classList.add('aipo-hidden');
  document.getElementById('aipo-tree').classList.remove('aipo-hidden');
  _pendingSnapshotUrl = null;
}

async function saveSnapshotContent() {
  const input   = document.getElementById('aipo-snap-input');
  const content = input.value.trim();

  if (!content) {
    showToast('⚠️ Chưa có nội dung. Paste response của AI vào!');
    return;
  }

  const url   = _pendingSnapshotUrl || window.location.href;
  const tree  = await getTree(SITE);
  const snaps = await getSnaps(SITE);

  const snap = {
    id:        `snap_${Date.now()}`,
    url,
    site:      SITE,
    title:     document.title,
    timestamp: new Date().toISOString(),
    content,   // ← nội dung THỰC từ AI response
  };

  // Gắn snapshot vào chat node khớp URL
  const updatedTree = tree.map(n =>
    (n.type === 'chat' && n.url === url)
      ? { ...n, snapshot: content, snapshotAt: snap.timestamp }
      : n
  );

  snaps.unshift(snap);
  if (snaps.length > 20) snaps.pop();

  await setTree(updatedTree, SITE);
  await setSnaps(snaps, SITE);
  await chrome.storage.local.set({ active_handover: snap });

  closeSnapPanel();
  if (activeTab === SITE) renderTree();
  showToast('✅ Snapshot đã lưu! Có thể Resume ở máy khác.');
}

async function handleResume() {
  const { active_handover } = await chrome.storage.local.get('active_handover');
  if (!active_handover) {
    showToast('⚠️ Chưa có Snapshot. Bấm 📸 Snapshot trước!');
    return;
  }
  if (!active_handover.content) {
    showToast('⚠️ Snapshot này chưa có nội dung. Tạo lại Snapshot mới.');
    return;
  }
  const ts = new Date(active_handover.timestamp).toLocaleString('vi-VN');
  injectText(
    `[RESUME — ${SITE_LABEL[active_handover.site]} — ${ts}]\n` +
    `Phiên: ${active_handover.title}\n\n` +
    `Đây là tóm tắt từ phiên trước, hãy tiếp tục hỗ trợ từ đây:\n\n` +
    active_handover.content
  );
  showToast('🚀 Đã inject context vào chat!');
}

// ============================================================
// LOCAL SYNC — export/import GỘP cả 3 namespace
// ============================================================
async function handleLocalSync(action) {
  try {
    if (action === 'export') {
      // Lấy cả 3 namespace
      const keys = [
        TREE_KEY('claude'), TREE_KEY('gemini'), TREE_KEY('chatgpt'),
        SNAP_KEY('claude'), SNAP_KEY('gemini'), SNAP_KEY('chatgpt'),
      ];
      const data = await chrome.storage.local.get(keys);
      const handle = await window.showSaveFilePicker({
        suggestedName: `aipo_backup_${Date.now()}.json`,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(
        { version: '3.4', exportedAt: new Date().toISOString(), ...data }, null, 2
      ));
      await writable.close();
      showToast('✅ Đã xuất backup cả 3 workspace!');

    } else {
      const [fh]   = await window.showOpenFilePicker({
        types: [{ accept: { 'application/json': ['.json'] } }],
      });
      const text   = await (await fh.getFile()).text();
      const parsed = JSON.parse(text);

      // Hỗ trợ cả file v3.3 cũ (projectTree) lẫn v3.4 mới
      const toSave = {};
      ['claude', 'gemini', 'chatgpt'].forEach(site => {
        const treeKey = TREE_KEY(site);
        const snapKey = SNAP_KEY(site);
        if (parsed[treeKey]) toSave[treeKey] = parsed[treeKey];
        if (parsed[snapKey]) toSave[snapKey] = parsed[snapKey];
      });
      // Fallback: file v3.3 có projectTree chung → nhập vào namespace SITE
      if (parsed.projectTree && !parsed[TREE_KEY('claude')]) {
        toSave[TREE_KEY(SITE)] = parsed.projectTree;
        showToast(`⚠️ File v3.3 cũ — nhập vào workspace ${SITE_LABEL[SITE]}`);
      }

      if (Object.keys(toSave).length === 0) throw new Error('File không hợp lệ');
      await chrome.storage.local.set(toSave);
      renderTree();
      showToast('✅ Đã nhập dữ liệu!');
    }
  } catch (err) {
    if (err.name !== 'AbortError') showToast('❌ ' + err.message);
  }
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, duration = 3000) {
  const t = document.getElementById('aipo-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('aipo-toast-show');
  setTimeout(() => t.classList.remove('aipo-toast-show'), duration);
}

// ============================================================
// BOOT
// ============================================================
waitForBody();