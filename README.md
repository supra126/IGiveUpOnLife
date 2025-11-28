# I Give Up On Life

> Build a complete brand visual asset? Nope. I quit.

An AI-powered marketing content design tool. Let your **AI minion** handle the grind—product identity, brand story, competitor strategy—while you just breathe.

---

## Try it now

### Online Demo

No setup needed. Just open and use.

**[igiveup.simoko.com](https://igiveup.simoko.com)**

### Local Setup

```bash
npx igiveup
```

> One command to launch
>
> Options: `--port 8080` `--lang en`

### Docker

```bash
docker run -p 8080:8080 supra126/igiveup

# With API Key (optional)
docker run -p 8080:8080 -e GEMINI_API_KEY=your-api-key supra126/igiveup
```

> Open http://localhost:8080

### Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/Iu7ojt?referralCode=EnYHPz&utm_medium=integration&utm_source=template&utm_campaign=generic)

---

## Features

### Phase 1: Strategy Selection

_The Grind Begins_

- **Smart Product Analysis**: Upload product image, AI decodes visual features & brand semantics
- **3 Strategy Routes**: Instantly generate 3 distinct marketing directions
- **Detailed Strategy Info**: Each route includes headline, visual style, target audience
- **Fast Response**: Strategy analysis in ~3 seconds, no image generation wait

### Phase 2: Content Planning

_Still Grinding_

#### Multi-Platform Sizes

| Size               | Best For                           |
| ------------------ | ---------------------------------- |
| **1:1 Square**     | FB posts, IG carousel, e-commerce  |
| **9:16 Vertical**  | Stories, Reels, full-screen mobile |
| **4:5 Portrait**   | IG Feed, mobile-optimized          |
| **16:9 Landscape** | Covers, ad banners                 |
| **1:1 Commercial** | Professional product photography   |

#### Content Planning

- **3 Sets Per Size**
  - Set 1: Feature-focused (emphasize product features)
  - Set 2: Emotion-focused (emphasize lifestyle & feelings)
  - Set 3: Data/Social proof (emphasize results & reviews)

- **Dual Mode**
  - **Roast This Content** (Script review mode)
  - **Crunch Time** (Image generation mode)

### Image Generation

#### Prompt Mode & Reference Mode

| Mode          | Description                          |
| ------------- | ------------------------------------ |
| **Prompt**    | Generate from AI visual prompts      |
| **Reference** | Upload reference, control similarity |

**Similarity Levels:**

- Low: Creative freedom (only color tone & mood)
- Medium: Moderate reference (lighting & colors, flexible composition)
- High: Close match (composition, layout, style)

#### Text & Visual Control

- Overlay title & copy on images
- 4 font weights (Noto Sans TC)
- Brand logo placement
- Live editing
- Per-image settings

---

## Tech Stack

| Category  | Technology                                                     |
| --------- | -------------------------------------------------------------- |
| Framework | Next.js 16 + React 19 + TypeScript                             |
| AI Models | Google Gemini                                                  |
|           | `gemini-2.5-flash` (text analysis & content planning)          |
|           | `gemini-3-pro-image-preview` (image generation)                |
| Styling   | Tailwind CSS                                                   |
| Fonts     | Inter + Playfair Display (UI), Noto Sans TC (generated images) |
| Auth      | Cloudflare Zero Trust (optional)                               |

---

## Installation

### Requirements

- Node.js 18+
- pnpm (recommended) or npm

### Quick Start

```bash
# Clone the repo
git clone https://github.com/your-username/IGiveUpOnLife.git
cd IGiveUpOnLife

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start dev server
pnpm dev
```

### Build & Deploy

```bash
# Server version (requires Node.js server)
pnpm build
pnpm start

# Static version (GitHub Pages, Cloudflare Pages, etc.)
pnpm build:static
pnpm start:static  # Local test
# Output: ./dist
```

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
# Gemini API Key (optional - if set, users get free access)
GEMINI_API_KEY=your-api-key

# Gemini Model Settings (optional)
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview
GEMINI_THINKING_BUDGET=2048

# Rate Limiting (only when using server API key)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_ENABLED=true

# Cloudflare Zero Trust (optional - verified users bypass rate limit)
CF_ACCESS_TEAM_NAME=your-team-name
CF_ACCESS_AUD=your-application-aud
```

> **Get Gemini API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)

### Server vs Static Build

| Feature       | Server                | Static             |
| ------------- | --------------------- | ------------------ |
| API Key       | Server-side supported | User must provide  |
| Rate Limiting | Server-controlled     | None               |
| Zero Trust    | Supported             | Not supported      |
| Deployment    | Node.js server        | Any static hosting |
| Output        | `.next/`              | `dist/`            |

---

## Cloudflare Zero Trust Integration

If your site is protected by Cloudflare Zero Trust, verified users can bypass rate limiting.

### Setup

1. Create Access Application in Cloudflare Zero Trust Dashboard
2. Get Team Name and Application AUD
3. Set in `.env.local`:

```bash
CF_ACCESS_TEAM_NAME=your-team-name
CF_ACCESS_AUD=your-application-aud
```

---

## User Flow

1. **Fill in Info**: Upload product image, product name, info, URL, reference copy
2. **AI Analysis**: Click "Let's Hustle", wait ~3-5 seconds
3. **Choose Strategy**: View 3 different strategy routes
4. **Select Sizes**: Check the sizes you need
5. **Auto-generate Scripts**: AI generates 3 content sets per size
6. **Upload Assets**: Product image (required), brand logo (optional)
7. **Review & Edit**: Switch to "Roast This Content" mode, edit content
8. **Generate Images**: Switch to "Crunch Time" mode, generate & download
9. **Export Report**: Click "Download Strategy Report"

---

## Project Structure

```
IGiveUpOnLife/
├── app/                    # Next.js App Router
│   ├── actions/           # Server Actions
│   │   └── gemini.ts      # Gemini API calls
│   ├── globals.css        # Global styles
│   ├── page.tsx           # Main page
│   └── layout.tsx         # Root layout
├── components/            # React Components
│   ├── ApiKeyModal.tsx    # API Key settings
│   ├── ContentSuite.tsx   # Phase 2 content suite
│   ├── GuideModal.tsx     # User guide
│   ├── ProductCard.tsx    # Product card
│   ├── PromptCard.tsx     # Prompt card
│   └── Spinner.tsx        # Loading spinner
├── services/              # Service Layer
│   ├── geminiService.ts   # Unified entry (auto-detect build mode)
│   └── geminiClient.ts    # Static build client-side API
├── lib/                   # Utilities
│   ├── rate-limit.ts      # Rate limiting
│   ├── cloudflareAccess.ts # Cloudflare Zero Trust
│   └── api-key-storage.ts # API Key storage
├── locales/               # i18n translations
│   ├── en.json            # English
│   └── zh.json            # Traditional Chinese
├── contexts/              # React Contexts
│   └── LocaleContext.tsx  # Locale provider
├── prompts.ts             # AI prompt templates
├── types.ts               # TypeScript types
└── next.config.ts         # Next.js config
```

---

## Why This Exists

### User Experience

- Zero design skills needed
- Fast response (~3 sec strategy)
- Smooth UX with polished animations
- Full control over AI-generated content

### Marketing Expertise

- Brand consistency based on story & features
- Competitor insights from reference copy
- Multi-angle strategies (feature, emotion, data)
- Multi-platform support in one go

### Technical Advantages

- Cost-optimized - only generate what's needed
- Flexible deployment - server or static
- Enterprise-ready - Cloudflare Zero Trust integration

---

## Contributing

Don't want to work alone? Neither do we.

- **Found a bug?** [Open an issue](https://github.com/supra126/IGiveUpOnLife/issues)
- **Feature idea?** Let's discuss
- **Want to code?** PRs welcome

> _"I don't want to work hard, but I'll review your PR."_ — The Maintainers

---

## Authors

| <a href="https://github.com/mag477"><img src="https://github.com/mag477.png" width="80" alt="mag477"/><br/><sub>@mag477</sub></a> | <a href="https://github.com/supra126"><img src="https://github.com/supra126.png" width="80" alt="supra126"/><br/><sub>@supra126</sub></a> |
| :-------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------: |

---

## License

MIT License

---

<p align="center">
  <i>Built with coffee and the desire to never work hard again.</i>
</p>

---

# 不想努力了

> 打造完整品牌視覺資產？不用，我不想努力了。

一個由 AI 驅動的產品行銷內容設計工具，讓 **小GG（AI 總監）** 幫你結合產品識別、品牌故事與競品策略，生成專業的廣告海報概念與視覺素材。你只需要負責呼吸就好。

---

## 立即試用

### 線上試用

免安裝，打開即用。

**[igiveup.simoko.com](https://igiveup.simoko.com)**

### 本地試用

```bash
npx igiveup
```

> 一行指令啟動
>
> 選項: `--port 8080` `--lang zh`

### Docker

```bash
docker run -p 8080:8080 supra126/igiveup

# 帶 API Key（可選）
docker run -p 8080:8080 -e GEMINI_API_KEY=your-api-key supra126/igiveup
```

> 開啟 http://localhost:8080

### Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/Iu7ojt?referralCode=EnYHPz&utm_medium=integration&utm_source=template&utm_campaign=generic)

---

## 功能特色

### 第一階段：視覺策略選擇

_讓我努力步驟一_

- **智能產品分析**：上傳產品圖片，AI 自動解讀視覺特徵與品牌語意
- **三條策略路線**：即時生成 3 種截然不同的行銷策略方向
- **詳細策略資訊**：每條路線包含主打標語、視覺風格、目標受眾
- **快速響應**：無需等待圖片生成，3 秒內完成策略分析

### 第二階段：完整內容企劃

_不努力步驟二_

#### 多平台尺寸支援

| 尺寸              | 適用場景                    |
| ----------------- | --------------------------- |
| **1:1 方形圖**    | FB 貼文、IG 輪播、電商主圖  |
| **9:16 直式長圖** | 限時動態、Reels、手機全螢幕 |
| **4:5 直式圖**    | IG Feed 主頁、優化手機瀏覽  |
| **16:9 橫式長圖** | 封面、廣告圖片              |
| **1:1 商業攝影**  | 專業商品攝影風格            |

#### 內容企劃功能

- **每個尺寸 3 組方案**
  - 功能導向（強調產品功能、特點）
  - 情感導向（強調生活情境、感受）
  - 數據/背書導向（強調成效、評價）

- **雙模式切換**
  - **內容來嘴看看**（腳本審閱模式）
  - **爆肝產圖**（圖片製作模式）

### 專業圖片生成

#### 提詞版 & 參考版

| 模式       | 說明                           |
| ---------- | ------------------------------ |
| **提詞版** | 使用 AI 生成的視覺 Prompt 創作 |
| **參考版** | 上傳參考圖片，控制相似度生成   |

**相似度控制：**

- 低：創意自由（僅參考色調與氛圍）
- 中：適度參考（光線與色彩，構圖彈性）
- 高：高度相似（構圖、佈局、風格）

#### 文字與視覺控制

- 可選擇在圖片上疊加標題和文案
- 4 種字重（思源黑體）
- 品牌 Logo 自動放置
- 即時編輯
- 每張圖片獨立設定

---

## 技術棧

| 類別    | 技術                                                       |
| ------- | ---------------------------------------------------------- |
| 框架    | Next.js 16 + React 19 + TypeScript                         |
| AI 模型 | Google Gemini                                              |
|         | `gemini-2.5-flash`（文字分析與內容規劃）                   |
|         | `gemini-3-pro-image-preview`（專業圖片生成）               |
| 樣式    | Tailwind CSS                                               |
| 字體    | Inter + Playfair Display（介面）、Noto Sans TC（生成圖片） |
| 認證    | Cloudflare Zero Trust（選填）                              |

---

## 安裝

### 環境要求

- Node.js 18+
- pnpm（推薦）或 npm

### 快速開始

```bash
# 克隆專案
git clone https://github.com/your-username/IGiveUpOnLife.git
cd IGiveUpOnLife

# 安裝依賴（泡杯咖啡，讓 pnpm 努力）
pnpm install

# 複製環境變數
cp .env.example .env.local

# 啟動開發伺服器
pnpm dev
```

### 建置與部署

```bash
# 伺服器版（需要 Node.js 伺服器）
pnpm build
pnpm start

# 靜態版（可部署到 GitHub Pages、Cloudflare Pages 等）
pnpm build:static
pnpm start:static  # 本地測試
# 輸出目錄: ./dist
```

### 環境變數設定

複製 `.env.example` 為 `.env.local`：

```bash
# Gemini API 金鑰（選填 - 若設定，用戶可免費使用）
GEMINI_API_KEY=your-api-key

# Gemini 模型設定（選填）
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview
GEMINI_THINKING_BUDGET=2048

# 速率限制（僅在使用伺服器 API 金鑰時生效）
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_ENABLED=true

# Cloudflare Zero Trust（選填 - 經過驗證的用戶不受速率限制）
CF_ACCESS_TEAM_NAME=your-team-name
CF_ACCESS_AUD=your-application-aud
```

> **取得 API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)

### 伺服器版 vs 靜態版

| 功能       | 伺服器版       | 靜態版       |
| ---------- | -------------- | ------------ |
| API 金鑰   | 支援伺服器端   | 用戶必須提供 |
| 速率限制   | 伺服器控制     | 無           |
| Zero Trust | 支援           | 不支援       |
| 部署方式   | Node.js 伺服器 | 任何靜態託管 |
| 輸出目錄   | `.next/`       | `dist/`      |

---

## Cloudflare Zero Trust 整合

如果你的網站經過 Cloudflare Zero Trust 保護，經過驗證的用戶不受速率限制。

### 設定步驟

1. 在 Cloudflare Zero Trust Dashboard 建立 Access Application
2. 取得 Team Name 和 Application AUD
3. 設定在 `.env.local`：

```bash
CF_ACCESS_TEAM_NAME=your-team-name
CF_ACCESS_AUD=your-application-aud
```

---

## 使用流程

1. **一次填完所有資訊**：上傳產品圖片、產品名稱、資訊、網址、參考文案
2. **AI 策略分析**：點擊「啟動努力」，等待約 3-5 秒
3. **選擇視覺策略路線**：查看 3 條不同的策略路線
4. **選擇圖片尺寸**：勾選你需要的尺寸
5. **自動生成內容腳本**：AI 為每個尺寸生成 3 組方案
6. **上傳產品圖與 Logo**：產品圖片（必要）、品牌 Logo（選填）
7. **腳本審閱與編輯**：切換至「內容來嘴看看」模式，編輯內容
8. **圖片製作**：切換至「爆肝產圖」模式，生成與下載
9. **匯出報告**：點擊「下載策略報告」

---

## 專案結構

```
IGiveUpOnLife/
├── app/                    # Next.js App Router
│   ├── actions/           # Server Actions
│   │   └── gemini.ts      # Gemini API 呼叫
│   ├── globals.css        # 全域樣式
│   ├── page.tsx           # 主頁面
│   └── layout.tsx         # 根佈局
├── components/            # React 元件
│   ├── ApiKeyModal.tsx    # API Key 設定
│   ├── ContentSuite.tsx   # 第二階段內容套件
│   ├── GuideModal.tsx     # 使用指南
│   ├── ProductCard.tsx    # 產品卡片
│   ├── PromptCard.tsx     # 提示卡片
│   └── Spinner.tsx        # 載入動畫
├── services/              # 服務層
│   ├── geminiService.ts   # 統一入口（自動偵測建置模式）
│   └── geminiClient.ts    # 靜態版客戶端 API
├── lib/                   # 工具函式
│   ├── rate-limit.ts      # 速率限制
│   ├── cloudflareAccess.ts # Cloudflare Zero Trust
│   └── api-key-storage.ts # API Key 儲存
├── locales/               # 多語系翻譯
│   ├── en.json            # 英文
│   └── zh.json            # 繁體中文
├── contexts/              # React Contexts
│   └── LocaleContext.tsx  # 語系提供者
├── prompts.ts             # AI 提示模板
├── types.ts               # TypeScript 類型
└── next.config.ts         # Next.js 設定
```

---

## 為什麼做這個

### 使用者體驗

- 零設計門檻
- 極速響應（約 3 秒完成策略分析）
- 流暢體驗，精緻動畫
- AI 生成內容完全可控

### 行銷專業

- 基於品牌故事與特色的品牌一致性
- 從參考文案獲得競品洞察
- 多角度策略（功能、情感、數據）
- 一次支援多平台

### 技術優勢

- 成本優化 - 只生成需要的內容
- 彈性部署 - 伺服器或靜態皆可
- 企業整合 - Cloudflare Zero Trust 支援

---

## 一起來努力（？）

不想一個人努力？我們也是。

- **發現 Bug？** [開一個 Issue](https://github.com/supra126/IGiveUpOnLife/issues)
- **功能建議？** 來討論看看
- **想寫程式？** 歡迎 PR

> _「我不想努力了，但我會 review 你的 PR。」_ — 維護者們

---

## 作者

| <a href="https://github.com/mag477"><img src="https://github.com/mag477.png" width="80" alt="mag477"/><br/><sub>@mag477</sub></a> | <a href="https://github.com/supra126"><img src="https://github.com/supra126.png" width="80" alt="supra126"/><br/><sub>@supra126</sub></a> |
| :-------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------: |

---

## 授權

MIT License

---

<p align="center">
  <i>用咖啡和「不想努力」的心情打造。</i>
</p>
