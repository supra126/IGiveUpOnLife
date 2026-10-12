# I Give Up On Life

> Build a complete brand visual asset? Nope. I quit.

An AI image workbench for designers. Drop in a reference image and your product shot, pick a similarity level, and let **GG** do the grinding.

[中文說明](#不想努力了)

---

## Try it now

### Online demo

**[igiveup.simoko.com](https://igiveup.simoko.com)**

### Local (static, bring your own key)

```bash
npx igiveup
```

Options: `--port 8080` `--host 0.0.0.0` `--lang en` `--no-open`

### Docker

```bash
docker run -p 8080:8080 supra126/igiveup

# Provide a shared server key (optional)
docker run -p 8080:8080 -e GEMINI_API_KEY=your-api-key -e TRUST_PROXY=1 supra126/igiveup
```

Open http://localhost:8080

### Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/i-give-up?referralCode=EnYHPz&utm_medium=integration&utm_source=template&utm_campaign=generic)

Set `TRUST_PROXY=1` on Railway so rate limiting sees real client IPs.

---

## Features

### Similar images (main mode)

- **Reference + product → new images**: the product is reproduced exactly; the reference only lends its style
- **Similarity levels**
  - **Low**: borrows only the color mood; composition, scene and lighting are reinvented
  - **Medium**: keeps lighting, palette and scene style; new composition, angle and props
  - **High**: near-replica of the reference with your product as the subject
- 10 aspect ratios (1:1 to 21:9), 1–8 variations per run, optional secondary product, extra instructions, reserved space for text

### Full campaign (second mode)

Product → analysis and 3 marketing routes → content plan per format (FB, Stories, IG, landscape, commercial photo) → generate every set. Titles, copy and prompts stay editable.

### Shared tools

- **Edit with a sentence**: "make the background light blue". Each edit becomes a version you can branch from
- **Extend ratio**: re-compose a finished image for another aspect ratio
- **Text & logo layers**: AI makes clean images; type is added in a layer editor (drag, scale, rotate, CJK web fonts, outline, shadow, layouts, apply to the whole group). Exports at original resolution
- **Batch & zip**: parallel queue with cancel, one-click zip with originals, text versions, copy and metadata
- **Model switching**: Nano Banana 2.1 (default), Nano Banana Pro, Nano Banana 2 Lite; Gemini 3.8 Flash or 3.1 Pro for text
- **Projects**: everything is saved in the browser (IndexedDB) and survives reloads
- Light/dark themes, Traditional Chinese and English

---

## Development

Requires Node.js 20.9+ and pnpm.

```bash
git clone https://github.com/supra126/IGiveUpOnLife.git
cd IGiveUpOnLife
pnpm install
cp .env.example .env.local
pnpm dev
```

```bash
pnpm build          # server version (standalone, used by Docker)
pnpm build:static   # static version → ./dist (used by npx igiveup)
pnpm test:run       # unit tests
pnpm typecheck && pnpm lint
```

### Environment variables

See `.env.example` for the full list.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Shared server key. Optional; users can always enter their own |
| `GEMINI_IMAGE_MODEL` / `GEMINI_TEXT_MODEL` | Default models (`gemini-nano-banana-2.1` / `gemini-3.8-flash`) |
| `GEMINI_ALLOWED_IMAGE_MODELS` / `GEMINI_ALLOWED_TEXT_MODELS` | Comma-separated allowlist for the shared key (e.g. block Pro on a public demo) |
| `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_MS` | Shared-key rate limit (default 2 per 60s) |
| `TRUST_PROXY` | `cloudflare`, or the number of trusted proxies (e.g. `1` on Railway). Unset = one shared bucket for everyone |
| `NEXT_PUBLIC_GEMINI_*_MODEL` | Default models for the static build |

### API key rules (server version)

- A key entered by the user is used first, without rate limiting or allowlists. It is relayed through your server (never logged by this app, but visible to whoever operates the server) and kept in the browser's `localStorage`.
- Without one, the server key is used with rate limiting and the model allowlist.
- In the static version (`npx igiveup`) the browser talks to Google directly with the user's key.

### Cloudflare Zero Trust

Users verified by Cloudflare Access bypass the shared-key rate limit:

```bash
CF_ACCESS_TEAM_NAME=your-team-name
CF_ACCESS_AUD=your-application-aud
```

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

## License

MIT License

<p align="center">
  <i>Built with coffee and the desire to never work hard again.</i>
</p>

---

# 不想努力了

> 打造完整品牌視覺資產？不用，我不想努力了。

給設計師用的 AI 生圖工作台。丟一張參考圖和你的產品圖，選相似度，剩下的交給 **小GG**。

---

## 立即試用

### 線上試用

**[igiveup.simoko.com](https://igiveup.simoko.com)**

### 本機（靜態版，使用自己的金鑰）

```bash
npx igiveup
```

選項：`--port 8080` `--host 0.0.0.0` `--lang zh` `--no-open`

### Docker

```bash
docker run -p 8080:8080 supra126/igiveup

# 提供共用的伺服器金鑰（選填）
docker run -p 8080:8080 -e GEMINI_API_KEY=your-api-key -e TRUST_PROXY=1 supra126/igiveup
```

開啟 http://localhost:8080

### Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/i-give-up?referralCode=EnYHPz&utm_medium=integration&utm_source=template&utm_campaign=generic)

在 Railway 設定 `TRUST_PROXY=1`，限流才能辨識真實 IP。

---

## 功能

### 相似圖（主要模式）

- **參考圖＋產品圖 → 新圖**：產品原樣保留，參考圖只提供風格
- **相似度**
  - **低**：只借參考圖的色調氛圍，構圖、場景、光線全部重新發想
  - **中**：保留光線、色調與場景風格，換構圖、角度與道具
  - **高**：幾乎照抄參考圖的畫面，只把主角換成你的產品
- 10 種比例（1:1 到 21:9）、一次 1–8 張、可加副產品、補充指示、預留文字空間

### 完整企劃（次要模式）

產品 → 分析與 3 條行銷路線 → 依版型（FB、限時動態、IG、橫式、商業攝影）規劃內容 → 逐組生成。標題、文案、生圖指令都可以改。

### 共用工具

- **一句話修圖**：「背景換成淺藍色」，每次修改都是一個新版本，可以從任一版本繼續
- **延伸比例**：把完成的圖重新構圖成其他比例
- **文字與 Logo 圖層**：AI 只產生乾淨的圖，文字在編輯器裡加（拖曳、縮放、旋轉、中文網頁字型、描邊、陰影、版型範本、套用到同組），以原圖解析度輸出
- **批次與打包**：可設定同時生成張數、可取消，一鍵打包 zip（原圖、含文字版、文案、專案資訊）
- **模型切換**：生圖 Nano Banana 2.1（預設）、Nano Banana Pro、Nano Banana 2 Lite；文字 Gemini 3.8 Flash 或 3.1 Pro
- **專案保存**：所有內容存在瀏覽器（IndexedDB），重新整理也不會不見
- 深淺色主題、繁體中文與英文

---

## 開發

需要 Node.js 20.9 以上與 pnpm。

```bash
git clone https://github.com/supra126/IGiveUpOnLife.git
cd IGiveUpOnLife
pnpm install   # 泡杯咖啡，讓 pnpm 努力
cp .env.example .env.local
pnpm dev
```

```bash
pnpm build          # 伺服器版（standalone，Docker 使用）
pnpm build:static   # 靜態版 → ./dist（npx igiveup 使用）
pnpm test:run       # 單元測試
pnpm typecheck && pnpm lint
```

### 環境變數

完整說明見 `.env.example`。

| 變數 | 用途 |
| --- | --- |
| `GEMINI_API_KEY` | 共用的伺服器金鑰，選填；使用者隨時可以輸入自己的 |
| `GEMINI_IMAGE_MODEL` / `GEMINI_TEXT_MODEL` | 預設模型（`gemini-nano-banana-2.1` / `gemini-3.8-flash`） |
| `GEMINI_ALLOWED_IMAGE_MODELS` / `GEMINI_ALLOWED_TEXT_MODELS` | 伺服器金鑰可用的模型白名單（逗號分隔，例如公開 demo 不開放 Pro） |
| `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_MS` | 伺服器金鑰的限流（預設每 60 秒 2 次） |
| `TRUST_PROXY` | `cloudflare`，或可信代理的層數（Railway 設 `1`）。未設定時所有人共用同一份額度 |
| `NEXT_PUBLIC_GEMINI_*_MODEL` | 靜態版的預設模型 |

### 金鑰規則（伺服器版）

- 使用者自己輸入的金鑰優先使用，不限流、不受白名單限制；請求會經由你的伺服器轉送（本程式不會記錄金鑰，但架站的人技術上看得到），金鑰存在瀏覽器的 `localStorage`。
- 沒有輸入時才使用伺服器金鑰，並套用限流與模型白名單。
- 靜態版（`npx igiveup`）由瀏覽器直接用使用者的金鑰連線 Google。

### Cloudflare Zero Trust

經過 Cloudflare Access 驗證的使用者不受伺服器金鑰限流：

```bash
CF_ACCESS_TEAM_NAME=your-team-name
CF_ACCESS_AUD=your-application-aud
```

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

## 授權

MIT License

<p align="center">
  <i>用咖啡和「不想努力」的心情打造。</i>
</p>
