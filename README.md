# ⬡ AI Project Organizer Ultimate

> Organize your AI chats. Never lose context again.  
> Quản lý chat AI theo dự án. Không bao giờ mất ngữ cảnh nữa.
<img width="3694" height="2192" alt="anh_da_chu_thich" src="https://github.com/user-attachments/assets/bdcc7b45-7db1-4478-b330-c94c66455b06" />


![Version](https://img.shields.io/badge/version-3.5-7c3aed)
![Manifest](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platforms](https://img.shields.io/badge/works%20on-Claude%20%7C%20Gemini%20%7C%20ChatGPT-orange)

---

## 🇻🇳 Tiếng Việt

### Vấn đề

Bạn dùng Claude, Gemini, ChatGPT hàng ngày. Theo thời gian:
- Danh sách chat ngày càng dài, lộn xộn
- Chuyển máy (nhà ↔ công ty) mất toàn bộ ngữ cảnh
- Không biết hôm qua đang làm dở dự án nào

### Giải pháp

**AI Project Organizer** là Chrome Extension thêm một Sidebar vào cạnh trái của Claude, Gemini và ChatGPT — giúp bạn:

- 📂 **Tạo thư mục dự án** và gán các đoạn chat vào đúng dự án
- 📸 **Snapshot ngữ cảnh** — yêu cầu AI tóm tắt tiến độ, lưu lại để dùng ở máy khác
- 🚀 **Resume** — inject ngữ cảnh vào chat mới, AI hiểu và tiếp tục ngay
- 💾 **Backup/Restore** — xuất file JSON ra USB hoặc ổ cứng, nhập lại bất cứ lúc nào
- 🔒 **100% offline** — không có server, không cloud, dữ liệu chỉ trên máy bạn

---

### 📦 Cài đặt

#### Cách 1 — Load thủ công (Developer Mode)

> Dùng cách này khi extension chưa có trên Chrome Web Store

**Bước 1:** Tải source code về máy
```bash
git clone https://github.com/ivanpham86/ai-project-organizer.git
```
Hoặc nhấn **Code → Download ZIP** rồi giải nén.

**Bước 2:** Mở Chrome, vào địa chỉ:
```
chrome://extensions
```

**Bước 3:** Bật **Developer mode** (góc trên phải)

**Bước 4:** Nhấn **Load unpacked** → chọn thư mục `ai-project-organizer`

**Bước 5:** Extension xuất hiện trong danh sách → mở [claude.ai](https://claude.ai), [gemini.google.com](https://gemini.google.com) hoặc [chatgpt.com](https://chatgpt.com) để dùng

---

### 🚀 Hướng dẫn sử dụng

#### Tạo thư mục & gán chat

1. Mở một đoạn chat bất kỳ trên Claude/Gemini/ChatGPT
2. Nhấn **📁** trong sidebar để tạo thư mục mới
3. Nhấn **💬+** để gán chat đang mở vào thư mục
4. Đặt tên có ý nghĩa (ví dụ: "Chrome Extension", "Marketing Q2")

#### Snapshot & Resume (chuyển máy)

**Tại máy cũ:**
1. Nhấn **📸 Snapshot** trong sidebar
2. Extension inject prompt vào ô chat → nhấn **Send**
3. Chờ AI trả lời với bản tóm tắt 3 phần
4. **Copy toàn bộ response** của AI
5. Nhấn **📋 Lưu response AI** → paste vào textarea → nhấn **💾 Lưu Snapshot**

**Tại máy mới:**
1. Export backup tại máy cũ: nhấn icon extension → **💾 Export**
2. Chép file `.json` sang máy mới (USB, email, AirDrop...)
3. Import tại máy mới: nhấn icon extension → **📂 Import**
4. Mở chat mới → nhấn **🚀 Resume** → AI nhận ngữ cảnh và tiếp tục

#### Thu gọn / mở rộng thư mục

Nhấn mũi tên **›** bên trái tên thư mục để thu gọn/mở rộng.  
Badge số (ví dụ `3`) hiện số chat bên trong khi thu gọn.

#### Tìm kiếm

Gõ vào ô search — tìm theo tên thư mục, tên chat và nội dung snapshot.

---

### 🗂 Cấu trúc thư mục

```
ai-project-organizer/
├── manifest.json      # Cấu hình extension (MV3)
├── content.js         # Sidebar UI + toàn bộ logic
├── style.css          # Giao diện sidebar
├── popup.html         # Popup khi click icon extension
├── popup.js           # Logic popup (export/import/stats)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

### 🔒 Bảo mật & Quyền riêng tư

Extension chỉ yêu cầu **1 permission duy nhất**: `storage` (lưu dữ liệu trên máy).

| Dữ liệu | Lưu ở đâu | Ra ngoài không? |
|---------|-----------|-----------------|
| Thư mục & chat bookmark | `chrome.storage.local` trên máy bạn | ❌ Không bao giờ |
| Nội dung snapshot | `chrome.storage.local` trên máy bạn | ❌ Không bao giờ |
| Nội dung chat thực | Không lưu | — |

Không có server. Không có analytics. Không có tài khoản.

---

### 🛠 Tech Stack

- **Chrome Extension Manifest V3**
- **Vanilla JavaScript (ES2022)** — không framework, không dependency
- **chrome.storage.local** — lưu trữ local
- Tương thích: **Claude** · **Gemini** · **ChatGPT**

---

## 🇬🇧 English

### The Problem

You use Claude, Gemini, and ChatGPT daily. Over time:
- Chat history becomes a long, unorganized mess
- Switching between devices (home ↔ office) means losing all context
- You can't remember which project you were working on yesterday

### The Solution

**AI Project Organizer** adds a Sidebar to Claude, Gemini, and ChatGPT — letting you:

- 📂 **Create project folders** and assign chats to the right project
- 📸 **Snapshot context** — ask the AI to summarize progress, save it for later
- 🚀 **Resume anywhere** — inject saved context into a new chat on any device
- 💾 **Backup/Restore** — export a JSON file to USB or drive, import anytime
- 🔒 **100% offline** — no server, no cloud, your data stays on your machine

---

### 📦 Installation

#### Manual Install (Developer Mode)

**Step 1:** Download the source code
```bash
git clone https://github.com/ivanpham86/ai-project-organizer.git
```
Or click **Code → Download ZIP** and unzip.

**Step 2:** Open Chrome and navigate to:
```
chrome://extensions
```

**Step 3:** Enable **Developer mode** (top right toggle)

**Step 4:** Click **Load unpacked** → select the `ai-project-organizer` folder

**Step 5:** The extension appears in the list → open [claude.ai](https://claude.ai), [gemini.google.com](https://gemini.google.com) or [chatgpt.com](https://chatgpt.com)

---

### 🚀 Quick Start

#### Create folders & assign chats

1. Open any chat on Claude/Gemini/ChatGPT
2. Click **📁** in the sidebar to create a new folder
3. Click **💬+** to assign the current chat to a folder
4. Name it something meaningful (e.g. "Chrome Extension", "Q2 Marketing")

#### Snapshot & Resume (cross-device)

**On your old machine:**
1. Click **📸 Snapshot** in the sidebar
2. The extension injects a prompt → press **Send**
3. Wait for the AI to respond with a 3-part summary
4. **Copy the AI's full response**
5. Click **📋 Save AI response** → paste → click **💾 Save Snapshot**

**On your new machine:**
1. Export backup on old machine: click extension icon → **💾 Export**
2. Transfer the `.json` file (USB, email, AirDrop...)
3. Import on new machine: click extension icon → **📂 Import**
4. Open a new chat → click **🚀 Resume** → the AI picks up right where you left off

---

### 🔒 Privacy & Security

The extension only requests **1 permission**: `storage`.

No server. No analytics. No account required. Your data never leaves your machine.

---

### 📄 License

MIT © [Ivan Pham](https://github.com/ivanpham86)

---

<div align="center">
  <sub>Made with ☕ for AI power users who value their workflows.</sub>
</div>
