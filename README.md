# 不想怒力了 I Give Up On Life

> 打造完整品牌視覺資產？不用，我不想努力了。

一個由 AI 驅動的產品行銷內容設計工具，讓 AI 幫你結合產品識別、品牌故事與競品策略，生成專業的廣告海報概念與視覺素材。

## ✨ 功能特色

### 🎯 Phase 1: AI 視覺策略分析

- **智能產品分析**：上傳產品圖片，AI 自動解讀視覺特徵與品牌語意
- **多元行銷路線**：根據產品特性生成 3 種不同的行銷策略方向
- **概念海報生成**：每個策略自動產生 3 張專業廣告海報概念圖

### 🚀 Phase 2: 完整內容企劃生成

- **8 張圖完整企劃**：包含 2 張主圖 + 6 張社群長圖 (Stories)
- **競品文案分析**：可選擇性輸入競品參考，AI 拆解說服邏輯並應用於您的產品
- **可編輯腳本**：所有生成的文案與視覺提示詞都可即時編輯調整
- **一鍵生圖**：直接從企劃腳本生成最終視覺素材

### 📊 專業報告輸出

- **策略報告下載**：完整的產品分析、策略選擇與內容企劃 (.txt)
- **視覺素材下載**：所有生成的圖片可單獨下載保存

## 🛠️ 技術棧

- **前端框架**: React 19 + TypeScript
- **構建工具**: Vite 6
- **AI 模型**: Google Gemini (gemini-2.5-flash, gemini-3-pro-image-preview)
- **樣式**: Tailwind CSS
- **字體**: Inter + Playfair Display

## 📦 安裝與使用

### 環境要求

- Node.js 18+
- npm 或 yarn

### 安裝步驟

```bash
# 克隆專案
git clone https://github.com/mag477/IGiveUpOnLife.git

# 進入專案目錄
cd IGiveUpOnLife

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

### 配置 API Key

1. 點擊右上角的「API 設定」按鈕
2. 輸入您的 Google Gemini API Key
3. API Key 會安全地儲存在瀏覽器本地存儲中

> 💡 如何獲取 Gemini API Key：前往 [Google AI Studio](https://aistudio.google.com/app/apikey) 註冊並創建 API Key

## 🎨 使用流程

1. **上傳產品圖片** - 支援 JPG、PNG 格式
2. **填寫產品資訊** - 輸入產品名稱與品牌背景（可選）
3. **AI 分析** - 點擊「啟動努力」按鈕
4. **選擇策略路線** - 從 3 種行銷策略中選擇最適合的方向
5. **查看概念圖** - 查看 AI 生成的 3 張概念海報
6. **生成完整企劃** - 點擊「生成 8 張圖腳本」
7. **編輯與調整** - 根據需求編輯文案與視覺提示詞
8. **一鍵生圖** - 點擊「生成圖片」按鈕產出最終素材
9. **下載成果** - 下載策略報告與所有圖片素材

## 🏗️ 專案結構

```
IGiveUpOnLife/
├── components/          # React 組件
│   ├── ApiKeyModal.tsx     # API Key 設定彈窗
│   ├── ContentSuite.tsx    # Phase 2 內容企劃套件
│   ├── GuideModal.tsx      # 使用指南彈窗
│   ├── ProductCard.tsx     # 產品分析卡片
│   ├── PromptCard.tsx      # 提示詞卡片
│   └── Spinner.tsx         # 載入動畫
├── services/            # 服務層
│   └── geminiService.ts    # Gemini API 整合
├── prompts.ts           # AI 提示詞模板
├── types.ts             # TypeScript 類型定義
├── App.tsx              # 主應用組件
├── index.tsx            # 應用入口
└── index.html           # HTML 模板
```

## 🌟 核心特點

- **零設計門檻**：不需要設計經驗，AI 自動生成專業視覺策略
- **品牌一致性**：基於品牌故事與產品特性，確保視覺風格統一
- **競品洞察**：可選擇性分析競品文案，學習成功的說服邏輯
- **完全可控**：所有 AI 生成內容都可編輯，保持創意自主權
- **流暢體驗**：精心優化的動畫與 UI，提供愉悅的使用體驗

## 📄 授權

MIT License

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📧 聯絡方式

如有問題或建議，歡迎開啟 [Issue](https://github.com/mag477/IGiveUpOnLife/issues)。

---

Made with 💙 by [mag477](https://github.com/mag477)
