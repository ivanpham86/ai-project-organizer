// popup.js v3.5 — Export/Import only, no cloud sync

const SITES = ['claude', 'gemini', 'chatgpt'];
const TREE_KEY = s => `projectTree_${s}`;
const SNAP_KEY = s => `snapshots_${s}`;

// ── Hiển thị thống kê ──
async function loadStats() {
  const keys = [
    ...SITES.map(TREE_KEY),
    ...SITES.map(SNAP_KEY),
  ];
  const data = await chrome.storage.local.get(keys);

  SITES.forEach(site => {
    const tree  = data[TREE_KEY(site)] || [];
    const chats = tree.filter(n => n.type === 'chat').length;
    const folders = tree.filter(n => n.type === 'folder').length;
    document.getElementById(`stat-${site}`).textContent =
      tree.length === 0 ? '—' : `${folders} thư mục · ${chats} chat`;
  });

  const totalSnaps = SITES.reduce((acc, s) => acc + (data[SNAP_KEY(s)] || []).length, 0);
  document.getElementById('stat-snaps').textContent =
    totalSnaps === 0 ? '—' : `${totalSnaps} snapshot`;
}

// ── Export ──
document.getElementById('btn-export').addEventListener('click', async () => {
  try {
    const keys = [...SITES.map(TREE_KEY), ...SITES.map(SNAP_KEY)];
    const data = await chrome.storage.local.get(keys);

    const exportData = {
      version:    '3.5',
      exportedAt: new Date().toISOString(),
      ...data,
    };

    const handle = await window.showSaveFilePicker({
      suggestedName: `aipo_backup_${Date.now()}.json`,
      types: [{ description: 'JSON Backup', accept: { 'application/json': ['.json'] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(exportData, null, 2));
    await writable.close();
    showStatus('✅ Đã xuất backup!');
    loadStats();
  } catch (err) {
    if (err.name !== 'AbortError') showStatus('❌ ' + err.message);
  }
});

// ── Import ──
document.getElementById('btn-import').addEventListener('click', async () => {
  try {
    const [fh]   = await window.showOpenFilePicker({
      types: [{ description: 'JSON Backup', accept: { 'application/json': ['.json'] } }],
    });
    const text   = await (await fh.getFile()).text();
    const parsed = JSON.parse(text);

    const toSave = {};

    // v3.5 format
    SITES.forEach(site => {
      if (parsed[TREE_KEY(site)]) toSave[TREE_KEY(site)] = parsed[TREE_KEY(site)];
      if (parsed[SNAP_KEY(site)]) toSave[SNAP_KEY(site)] = parsed[SNAP_KEY(site)];
    });

    // Fallback: file v3.3 cũ có projectTree chung
    if (parsed.projectTree && Object.keys(toSave).length === 0) {
      toSave['projectTree_claude'] = parsed.projectTree;
      showStatus('⚠️ File cũ — đã nhập vào workspace Claude');
    }

    if (Object.keys(toSave).length === 0) {
      showStatus('❌ File không hợp lệ');
      return;
    }

    await chrome.storage.local.set(toSave);
    showStatus('✅ Đã nhập dữ liệu!');
    loadStats();
  } catch (err) {
    if (err.name !== 'AbortError') showStatus('❌ ' + err.message);
  }
});

function showStatus(msg) {
  const el = document.getElementById('status');
  el.textContent = msg;
  setTimeout(() => el.textContent = '', 3000);
}

loadStats();