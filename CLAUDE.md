# 健身紀錄網頁

重訓記錄系統。2026-11-17 從 claude.ai 的對話搬過來，聊天內容由使用者貼上後整理成這份文件。

## 最重要的原則
**全部放在使用者自己的 Google 帳號，不要綁在 Claude 上。** 使用者明確說過：退訂 Claude 之後也要能用。新功能一律做在 Google Sheets / AppSheet / Apps Script，不要再做成 Claude Artifact。

## 目前在用的系統（三個部分，共用同一份試算表）

### 1. Google 試算表「重訓紀錄」（資料庫）
- https://docs.google.com/spreadsheets/d/10rCfwHKfLNkLQRd9AInudcuVDsqTFryCfSKh6Nlomrk/edit
- spreadsheetId：`10rCfwHKfLNkLQRd9AInudcuVDsqTFryCfSKh6Nlomrk`
- 分頁：
  - `推日紀錄`、`拉日紀錄`、`腿日紀錄`：一天一列，每個動作有 熱身重量、⭐正式重量、⭐突破重量、每組次數
  - `訓練紀錄`：**用公式**從上面三張表自動展開（熱身算 1 組、正式算 3 組），唯讀，不要手動寫入。欄位：紀錄ID、日期、訓練日、動作、組別、重量kg、次數、組數
  - `動作`：菜單（訓練日、動作、部位、熱身重量kg、做組重量kg、預設次數、預設組數、備註）
  - `設定`：每週目標次數 = 3，推/拉/腿都要練到
  - `儀表板`：Google Sheets 公式算的統計（gid=3）。曾經「發布到網路」，**已停止發布**
  - `身體狀況`：疲勞程度、身體狀況（多選）、痠痛部位、睡眠時數、備註
- 欄位名稱不要改；舊版 App 寫進錯誤的單筆紀錄曾讓統計壞掉

### 2. AppSheet App「重訓紀錄」（手機記錄）
- 使用者用手機 AppSheet 登入 Google 帳號使用，跟 11/14 做的「棒球觀賽日記」App 放在一起
- 下方四個分頁：推日／拉日／腿日／紀錄
- 一張表單記完一整天所有動作，每個動作有自己的標題（`━━ 🏋️ 動作名 ━━`），底下是 熱身 kg、⭐ 正式 kg、⭐ 突破 kg、每組次數
- 預設值：重量帶「上次同一動作」填的數字，第一次帶菜單重量；次數推日/拉日 8 下、腿日 10 下；沒做的動作留空
- App 更新後手機要 ☰ → Sync，再完全關掉重開，不然會跑快取的舊版

### 3. Google Apps Script 後端 API + GitHub Pages 獨立前端「重訓紀錄」（目前主力網頁）
- **GitHub Repo**：https://github.com/MCkkkjese/workout-log （本機已初始化 `.git`，可用 Sourcetree 或 `git push` 管理）
- **GitHub Pages 線上網址**：https://mckkkjese.github.io/workout-log/
- **前端本機檔案**：`index.html`、`version.json`、`manifest.json`、`apple-touch-icon.png`（iOS `🏋🏻` Emoji＋白漸層）、`icon-192.png`、`icon-512.png`
- **後端檔案**：`apps-script/Code.gs`（已同步部署到 Apps Script「重訓儀表板」專案，版本 5；執行身分：**我**、誰可以存取：**所有人**）
  - `/exec` 網址：`https://script.google.com/macros/s/AKfycbzI24qk2i3BUXBsDqUchV4JmmpU-NgGskHZTKzd26LEIkjIqXaYTD3EysZtcoC7bZFu/exec`
  - 支援 `doGet(e)`（`?api=1` 回傳 JSON）與 `doPost(e)`（`Content-Type: text/plain;charset=utf-8` 避開 CORS preflight），可選設 `API_TOKEN`
  - 支援動作：`getData`、`saveWorkout`、`updateWorkout`、`deleteWorkout`、`saveBody`、`updateBody`、`deleteBody`、`addExercise`、`updateExercise`
- **風格與設定**：
  - 米奶茶色系：背景 `#F2EDE6`、卡片 `#F9F6F1`、邊框 `#E4DBD0`（圓角 24–26px）、主文字 `#3A2F28`、次要文字 `#6E6259`、主色咖啡 `#9A6B4F`、完成綠 `#4F7A57`
  - 標題採 **思源宋體（Noto Serif TC）**、內文採 **思源黑體（Noto Sans TC）**；介面圖示一律用線條 SVG；「雜項」頁支援切換 **奶茶色 / 深色模式**
  - 敏感的 `API 網址` 與 `Token 密碼` 摺疊收納於「雜項」內的「進階：資料庫連線設定」
  - 所有設定（主題、API 網址、Token）皆儲存於瀏覽器 **Cookie**（相容舊 `localStorage`）；訓練資料另存 `localStorage` 快取 (`gym_cache`) 以秒開
- **更新與防快取機制**：
  - 每次更新前端時需同步更新 `index.html` 內的 `APP_VERSION` / `APP_UPDATED` 以及 `version.json`
  - 頁面啟動時先讀快取秒開，同時背景以 `fetch('version.json?_t=' + Date.now(), { cache: 'no-store' })` 檢查版本，若有新版則帶 `?_v=...` 自動無感重整（搭配 `sessionStorage` 防迴圈）
  - 頁首支援 **往下拉重新整理（Pull-to-Refresh）**；頁面最下方顯示目前版本號與網頁更新時間（目前為 `v2.1.1`）
- **導覽與分頁架構**（底部 Liquid Glass 懸浮 5 格導覽列：`首頁｜重量｜＋｜日記｜其他`）：
  - **首頁**：頁首顯示日期與大標；**主卡**上半部為 210px 置中本週進度圓環、剩餘天數與推拉腿 40px 標籤，分隔線下半部為本月出勤率百分比＋14px 橫條＋iOS Emoji 等級（`😄` ≥ 70%、`😐` 40%–69%、`😭` < 40%，0% 最少顯示 3% 寬）＋「已練 X 次 ／ 應練 Y 次」；**第二張卡**兩欄合併「上次訓練」與「連續達標（含歷史最高 `bestStreak` 週）」；**第三張卡**顯示身體狀況文字與「更新 ›」；往下滑顯示「**本月出勤日曆**」與「**近期訓練日記**」（最近 4 筆，可點擊編輯）；移除首頁最強重量區塊與右下角懸浮 `＋`
  - **重量**（原「動作重量」）：推/拉/腿切換，大字顯示上次熱身、⭐正式、⭐突破，下方附最強重量與最近升降
  - **日記**（原「達標」，合併「本週進度」＋「出勤」）：本週每天標記、訓練日列表與建議、本月出勤率、本月日曆、近 6 個月結算、近 8 週長條圖與累計次數
  - **其他**（原「修改紀錄」，四子分頁：`訓練紀錄` / `身體狀況` / `動作管理` / `雜項`）：`訓練紀錄` 供修改刪除；`身體狀況` 整合最新狀態、近 30 天統計、疲勞趨勢圖與可編輯的月別紀錄列表；`動作管理` 供新增／修改動作；`雜項` 僅保留外觀切換、手動同步與進階連線設定（移除重複的身體狀況區塊）
- **底部中央 `＋`**：60px 向上凸起圓鈕，開啟記錄訓練／身體狀況選單；訓練表單帶上次重量、−/＋ 微調、「今天沒做」可略過，最下方內嵌選填身體狀況

## 菜單（`動作` 分頁）
- **推日**：臥推 22.5、胸推 20、肩推 17.5、側平舉（躺 45 度）7.5、三頭屈伸 熱身 16.25 / 做組 18.75
- **拉日**：上背划船（寬）35、單側划船 16.25、垂直下拉 熱身 31.25 / 做組 36.25、二頭彎舉 熱身 7.5 / 做組 10、二頭垂直舉
- **腿日**：腿推機 熱身 50×12–15 / 正式 90×8–10×3、坐姿腿屈伸機（股四頭，原名「坐姿屈伸舉機」）熱身 25×12 / 正式 45×10–12×3、坐姿腿後勾機 熱身 20×12 / 正式 40×10–12×3、啞鈴保加利亞分腿蹲 熱身徒手×8 / 正式每手 8–10 kg×8–10×3
- 預設組數：每個動作 1 組熱身 + 3 組正式

## 已淘汰（不要再用）
這個資料夾裡的 `重訓記錄/` 和 `重訓儀表板/` 是早期做的 Claude Artifact 備份，已被 AppSheet + Apps Script 取代：
- https://claude.ai/artifact/FPNZFZPwwAE1aFFpqgpt75（重訓記錄）
- https://claude.ai/artifact/XVVNazTmpFkKfb6N6XMe2B（重訓儀表板）
使用者還沒決定要不要刪掉這兩個 Artifact，刪除前要先問。

## 本機同步狀態
- 前端 `index.html` 與後端 `apps-script/Code.gs` 皆已在本機追蹤並納入 Git；修改前端後直接 `git push` 即自動更新 GitHub Pages，修改 `apps-script/Code.gs` 後需到 Apps Script 專案「重訓儀表板」同步貼上並「管理部署作業 → 建立新版本」。
