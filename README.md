# ApplyFlow

ApplyFlow 是個人使用的求職申請追蹤 Dashboard。貼上完整 Job Description 後，系統會以規則解析公司、國家與職位，先檢查是否重複；只有在使用者按下「我已完成申請」後才會建立紀錄。

## 功能

- Dashboard：總申請數、各狀態、近期申請、月度活動
- Applications：搜尋、國家／狀態篩選、日期排序、狀態更新、詳細資料與刪除確認
- Add Application：JD 規則解析、手動修正、正規化重複檢查、確認後新增
- 完整 Loading、Empty、Error 與繁體中文 Dialog
- 未設定 API 時使用瀏覽器 localStorage mock data
- 設定 API 後串接 Google Apps Script / Google Sheets

## 技術棧

React、TypeScript、Vite（vinext）、Tailwind CSS、React Router 相容前端結構、ESLint、Google Apps Script、Google Sheets。

## 本機啟動

```bash
npm install
npm run dev
```

正式檢查：

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## 環境變數

複製 `.env.example` 為 `.env.local`，填入 Apps Script Web App URL：

```env
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

目前的 Sites/Vinext 執行環境讀取 `NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL`；標準 Vite 版本可使用需求指定的 `VITE_GOOGLE_APPS_SCRIPT_URL`。URL 不會寫死在程式中。

## Google Sheet 與 Apps Script

1. 建立一份 Google Sheet。
2. 開啟「擴充功能 → Apps Script」。
3. 將 `google-apps-script/Code.gs` 貼入編輯器。
4. 專案時區設為所在時區。
5. 「部署 → 新增部署 → 網頁應用程式」；執行身分選擇自己，存取權依個人使用情境設定。
6. 將部署 URL 寫入 `.env.local`。

程式會自動建立 `Applications` 工作表與欄位：`Company`、`Country`、`Position`、`AppliedDate`、`Status`。

## API

- `GET`：取得所有申請
- `POST action=checkDuplicate`：以 Company + Country + Position 檢查重複
- `POST action=createApplication`：自動填入今日日期與 Waiting
- `POST action=updateStatus`：更新狀態
- `POST action=deleteApplication`：刪除指定紀錄

## 專案結構

```text
app/                      頁面入口與全域樣式
src/
  components/             可重用 UI、Dialog 與狀態元件
  services/
    applicationApi.ts     Mock / Apps Script API
    jobParser/            可替換的 JD Parser
  types/                  資料型別
  utils/                  重複判斷與等待天數
  mocks/                  範例資料
google-apps-script/       Google Apps Script 範例
```

## 未來功能

Gmail 同步、自動判斷 Interview / Rejected、Email Center、Follow-up Reminder、AI JD Parser、進階圖表、Chrome Extension。
