// ============================================================
// background.js v3.4 — Multi-Sync Adapter
// Thay đổi so với v3.1:
//   - Sync gộp cả 3 namespace: projectTree_claude/gemini/chatgpt
//   - Google Drive: PATCH thay vì POST (tránh duplicate)
// ============================================================

let driveFileId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sync_data') {
    handleSync(request.provider)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// ── Lấy toàn bộ data từ cả 3 namespace ──
async function getAllWorkspaceData() {
  const keys = [
    'projectTree_claude',  'projectTree_gemini',  'projectTree_chatgpt',
    'snapshots_claude',    'snapshots_gemini',    'snapshots_chatgpt',
  ];
  return await chrome.storage.local.get(keys);
}

async function handleSync(provider) {
  const data = await chrome.storage.local.get([
    'gh_token', 'gist_id',
    'projectTree_claude', 'projectTree_gemini', 'projectTree_chatgpt',
    'snapshots_claude',   'snapshots_gemini',   'snapshots_chatgpt',
  ]);

  if (provider === 'GIST') {
    await syncToGist(data);
  } else if (provider === 'GOOGLE_DRIVE') {
    const { gh_token, gist_id, ...workspaceData } = data;
    await syncToGoogleDrive(workspaceData);
  }
}

// ── GOOGLE DRIVE — PATCH nếu đã có file ──
async function syncToGoogleDrive(workspaceData) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async token => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      try {
        const blob = new Blob(
          [JSON.stringify({ version: '3.4', syncedAt: new Date().toISOString(), ...workspaceData }, null, 2)],
          { type: 'application/json' }
        );
        if (!driveFileId) driveFileId = await findDriveFile(token);
        if (driveFileId) {
          await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media`,
            { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: blob }
          );
        } else {
          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify({ name: 'ai_project_sync.json', parents: ['appDataFolder'] })], { type: 'application/json' }));
          form.append('file', blob);
          const res  = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
            { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
          );
          const json = await res.json();
          driveFileId = json.id;
        }
        resolve();
      } catch (err) { reject(err); }
    });
  });
}

async function findDriveFile(token) {
  const res  = await fetch(
    "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='ai_project_sync.json'&fields=files(id)",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  return json.files?.[0]?.id || null;
}

// ── GITHUB GIST ──
async function syncToGist(data) {
  if (!data.gh_token || !data.gist_id) throw new Error('Chưa cấu hình GitHub Token hoặc Gist ID');
  const { gh_token, gist_id, ...workspaceData } = data;
  const res = await fetch(`https://api.github.com/gists/${gist_id}`, {
    method: 'PATCH',
    headers: { Authorization: `token ${gh_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: {
        'ai_sync.json': {
          content: JSON.stringify({ version: '3.4', syncedAt: new Date().toISOString(), ...workspaceData }, null, 2),
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GitHub API: ${err.message}`);
  }
}