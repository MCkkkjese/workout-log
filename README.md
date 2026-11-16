# 重訓紀錄網頁（本地 / GitHub Pages 版）

前端為純靜態 HTML/CSS/JS（[index.html](./index.html)），可直接放在本地或部署到 GitHub Pages；後端透過 Google Apps Script API（[apps-script/Code.gs](./apps-script/Code.gs)）讀寫你的 Google 試算表「重訓紀錄」，與 AppSheet 共用同一份資料庫。

## 檔案說明
- `index.html`：獨立前端網頁（可直接上傳到 GitHub Pages 作為首頁）
- `apps-script/Code.gs`：Google Apps Script 後端程式（同時保留原本網頁模式與新增 JSON API 模式）

## 第一次啟用步驟（只需做一次）

### 1. 更新 Google Apps Script 後端
1. 打開你的 Apps Script 專案「重訓儀表板」（[開啟編輯器](https://script.google.com/home/projects/1ew9k3qLB3AbSYJxr363IakNAoDHL7aa79X7ojQFrLK2h9tSBU1eV3D0Q/edit)）。
2. 把 [apps-script/Code.gs](./apps-script/Code.gs) 的內容完整覆蓋貼進原本的 `程式碼.gs` / `Code.gs`（建議順便在最上方 `API_TOKEN = '...'` 填一組自己的密碼）。
3. 按儲存，然後點右上角 **「部署」→「管理部署作業」→ 編輯（鉛筆圖示）**：
   - 版本選 **「建立新版本」**
   - 執行身分：**「我」**
   - 誰可以存取：**「任何人」**（這樣 GitHub Pages 或本機網頁才能透過 API 連線；有設 `API_TOKEN` 就只有知道密碼的人能讀寫）
4. 按「部署」，複製網頁應用程式網址（結尾為 `/exec`）。

### 2. 本地預覽
在專案資料夾執行：
```bash
python3 -m http.server 8080
```
用瀏覽器打開 `http://localhost:8080`，點右上角 `⚙️` 貼上 `/exec` 網址與 `API_TOKEN` 並按「儲存並同步資料」即可。

### 3. 上傳到 GitHub Pages
將本專案推上 GitHub 後，到 Repository 的 **Settings → Pages**：
- Source 選 `Deploy from a branch`
- Branch 選 `main`（`/ (root)`）
- 儲存後即可透過 `https://<你的帳號>.github.io/<倉庫名稱>/` 在手機打開，並用 Safari「加入主畫面」當成 App 使用。
