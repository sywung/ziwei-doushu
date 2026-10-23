<div align="center">

# 紫微斗數 · 開源排盤引擎

[![CI](https://github.com/Renhuai123/ziwei-doushu/actions/workflows/ci.yml/badge.svg)](https://github.com/Renhuai123/ziwei-doushu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](./LICENSE)
[![Dataset: CC BY 4.0](https://img.shields.io/badge/dataset-CC%20BY%204.0-green.svg)](./DATASET-LICENSE)

**中文** · [English](./README.en.md)

</div>

> ## 關於這個 fork（sywung/ziwei-doushu）
>
> 這是 [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu) 的個人自架版，補上開源版沒有的後端與功能，並修了幾個上游缺陷。下方「一」以後的章節是上游原文，說的是上游的狀態。
>
> **新增功能**
> - 13 宮解讀：直接讀 v4 解讀資料集（`/api/reading`，位元組偏移索引，查詢約 0.3 秒）
> - 全時序運限：本命／大限（含童限）／小限／流年／流月／流日／流時
> - 命理學雙子：在 1950–2026 年每個出生時刻裡找配置相同的盤，分主星／主星＋四化／全盤三層、同年／跨年；獨立頁 `/twins` 另有命盤指紋與「同盤時刻表」（各地鐘錶幾點出生會同盤）
> - AI 問盤、四化飛化、合盤分析（`/api/interpret`、`/api/heming`，OpenAI 相容端點）；對話紀錄只存在瀏覽器
> - 排盤流派切換：亮度表、庚年四化、魁鉞、截空、天馬、閏月、晚子時（補回開源版被刪掉的流派修正）
> - 出生日期可輸入農曆（含閏月）；台灣 22 縣市置頂，台灣夏令時與日治時期（UTC+9）自動換算
> - 三紀字幕導播（天紀 4,886 條、人紀 19,294 條判語逐句回放 B 站原影片）
> - 命盤報告匯出（列印／PDF、PNG）；介面繁體中文
>
> **修掉的上游缺陷**：命盤頁 23:00 後出生不換日（與合盤頁排出不同的盤）、AI 串流拆行掉字、元件 `--t-*` CSS 變數未定義、知識庫主星連結全部 404、PNG 匯出文字位移與色塊錯誤。
>
> **自架需要的資料**（都不在 repo 裡，沒有的功能會顯示讀取失敗，排盤照常）
>
> | 功能 | 資料 | 產生方式 | 環境變數 |
> |---|---|---|---|
> | 13 宮解讀 | v4 資料集解壓後的 `year-YYYY.jsonl`（約 53 GB） | 見下方「二·新」下載；`npx tsx scripts/reading/build-index.ts <dataDir> [indexDir]` 建索引 | `READING_DATA_DIR`、`READING_INDEX_DIR` |
> | 命理學雙子 | 索引檔（約 13 MB） | `npx tsx scripts/twins/build-index.ts <outFile> --jobs N`（16 核約 7 分鐘） | `TWINS_INDEX_FILE` |
> | 三紀字幕導播 | `tianji/`、`renji/` 的 `entries.jsonl` | 取自 [nihai-tianji-corpus](https://github.com/Renhuai123/nihai-tianji-corpus)、[nihai-renji-corpus](https://github.com/Renhuai123/nihai-renji-corpus)（CC BY-NC-SA 4.0，不可商用） | `SANJI_DATA_DIR` |
> | AI | OpenAI 相容端點與金鑰 | — | `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL` |
>
> 設定範例見 [`.env.example`](./.env.example)；容器部署見 [`deploy/Containerfile`](./deploy/Containerfile) 與 Podman quadlet 範例 [`deploy/ziwei.container.example`](./deploy/ziwei.container.example)：
>
> ```bash
> podman build -f deploy/Containerfile --build-arg NEXT_PUBLIC_SITE_URL=https://你的網址 -t localhost/ziwei-doushu:latest .
> ```
>
> 授權同上遊：程式碼 MIT（保留原作者版權聲明），資料依各自授權。
>
> 覺得有用，歡迎[贊助本 fork 的維護](#贊助)。

基於<strong>倪海廈《天紀》</strong>教學體系的紫微斗數排盤系統，包含完整排盤算法、四化系統、格局知識庫、古籍原文數據，以及一套完整開源的紫微斗數解讀數據：**v4.0 解讀數據集——67.5 萬張命盤 × 13 維 = 877 萬段解讀，正文約 204 億字，解壓後 56.6 GB**（2026-10-15 發佈）。

| 數據集 | 命盤 | 解讀段數 | 解壓後 | 覆蓋年份 | 每張盤解讀字數 |
|---|---|---|---|---|---|
| **v4.0 解讀數據集**（2026-10-15） | **674,976** | **8,774,688** | **56.6 GB** | **1950–2026**（只含真實日期） | **約 3.0 萬字** |
| v3.0 樣本數據集 | 518,400 | 6,739,200 | 33.1 GB | 1924–1983 | 約 2.1 萬字 |
| 變化 | +30% | +30% | **+71%** | +17 年 | +44% |

<sub>v3.0 每張盤解讀字數按 2,160 張盤抽樣估算，其餘數字為全量統計；兩版每張盤都是 13 維。</sub>

在線體驗：[metisziwei.com](https://metisziwei.com/?from=gh-readme)，排盤、AI 解讀、命盤歷史全部開放。

> **注：關於六親判斷**
>
> 紫微斗數在六親（父母、兄弟、子女等）判斷上存在一定侷限。倪師在《天紀》中指出：“斗數批六親本來就比較差一點。”（[2上 · 00:25:27](https://www.bilibili.com/video/BV1KJsLekEfA?p=3&t=1527)）在傳統術數中，鐵板神數在核對六親方面有其獨特優勢（[2上 · 00:03:15](https://www.bilibili.com/video/BV1KJsLekEfA?p=3&t=195)）；倪師仍以紫微斗數為核心，是因為它能結合地理、環境與人事進行綜合判斷，形成“上知天文、下知地理、中知人事”的完整體系（[2上 · 00:25:43](https://www.bilibili.com/video/BV1KJsLekEfA?p=3&t=1543)）。因此，與六親相關的分析僅供參考；[metisziwei.com](https://metisziwei.com/?from=gh-readme) 上父母、兄弟、子女三個維度也附有同樣的說明。

---

## 目錄

| | 章節 | 一句話 |
|---|------|--------|
| 一 | [本輪更新](#一本輪更新2026-10-15) | 13 維斷語按倪師原話與《全書》逐句校正，發佈 67.5 萬命盤 × 13 維解讀數據集 v4.0 |
| 二·新 | [13 維解讀數據集 v4.0](#二新13-維解讀數據集-v402026-10-15) | 2026-10-15 新版斷語，67.5 萬命盤，按年份下載 |
| 二 | [51.8 萬命盤樣本數據集](#二518-萬命盤樣本數據集) | 規格、下載、用途、許可 |
| 三 | [快速開始](#三快速開始) | 克隆到跑起來 |
| 四 | [排盤引擎](#四排盤引擎) | 能做到什麼、文件怎麼分、古籍數據 |
| 五 | [倪師《天紀·紫微斗數》原話](#五倪師天紀紫微斗數原話) | 14 講 + 2 段補充、1848 條，一圖看全，每條可回放 |
| 六 | [界面是一份 Demo](#六界面是一份-demo) | 不是線上那套，差距寫明 |
| 七 | [開源邊界](#七開源邊界什麼不在裡面) | 什麼開源、什麼不開源 |
| 八 | [維護節奏與貢獻](#八維護節奏與貢獻) | 同步節奏、issue / PR 口徑 |
| 九 | [協議](#九協議) | 代碼 MIT / 數據 CC BY 4.0 / 古籍公版 / 倪師原話非商用 |
| 十 | [關於與贊助](#十關於與贊助) | 項目理念、技術棧、贊助 |

---

## 一、本輪更新（2026-10-15）

本輪跟隨網站 2026-10-15 發版（網站內容版本 `ca268829f7a9`）：

![本輪更新總覽](./docs/update-20261015.png)

**1. 發佈 13 維解讀數據集 v4.0** —— 674,976 張命盤（公曆 1950–2026 年每一個真實日期 × 12 時辰 × 男女）× 13 維 = **8,774,688 段解讀**，正文約 204 億字。解壓後 56.6 GB（v3.0 為 33.1 GB，增加 71%），壓縮後只有 161 MB，按年份分 77 個文件，可以只下需要的年份，也可以一次下全年份總包。下載見 [Release v4.0-13d](https://github.com/Renhuai123/ziwei-doushu/releases/tag/v4.0-13d)，規格和字段見[第二·新章](#二新13-維解讀數據集-v402026-10-15)。發佈前 77 個文件逐個解壓，與原始數據逐字節比對一致。

**2. 13 維斷語按倪師原話與《全書》原文逐句校正**（斷語庫仍不開源，校正結果體現在 v4.0 數據集裡）：

- 標著倪師或《全書》卻查不到出處的引文，刪掉或換成逐字可查的原話；倪師原話註明《天紀》第幾集、幾分幾秒
- 不會發生的四化（如七殺化權、紫微化忌）相關的句子刪去；只在某種條件下才成立的斷語補上條件
- 「力量強時……落陷時……」這類兩頭說的句子，改為按命盤只顯示成立的那一種
- 健康：哪個臟腑要留意，改按倪師的看法——全盤殺星最集中的那一宮，按它的地支對應臟腑；不再按星的五行推臟器
- 網站知識庫「古籍引證」由 244 處增至 405 處，每一處都能在《紫微斗數全書》原文裡逐字找到

**3. 排盤引擎同步**（[PR #39](https://github.com/Renhuai123/ziwei-doushu/pull/39)）—— `dst-cn.ts` 新增 `chinaDSTSpan(year)`，查某年中國夏令時起止；`cities.ts` 補全省直轄縣級單位與新疆兵團各市的經度（神農架、海南各市縣、阿拉爾等），出生地選這些城市時真太陽時校正可用。

**4. 許可** —— [`DATASET-LICENSE`](./DATASET-LICENSE) 適用範圍加上 v4.0；寫明解讀裡引用的倪師原話不在數據授權範圍內，與第五章倪師原話的 CC BY-NC-SA 4.0 一致。v3.0 樣本數據集及其條款不變。

> **2026-10-20 補充**：星曜亮度默認改為《斗數全書》，與主流排盤軟件默認一致，此前默認的「現代修正 v2」仍可在流派設置裡選；補齊天姚、天刑、天喜、大耗、解神、截空、副截、旬空的亮度，月德不再標亮度。用 5 張金標準盤逐宮核對，星曜落宮與亮度全部吻合。注意：v4.0 數據集（10-15）是按舊默認「現代修正 v2」生成的，其中亮度字和少量隨亮度變化的解讀句會與新默認不同。

> **2026-10-06 ~ 10-07 補充**：README 加「注：關於六親判斷」（倪師原話 + 出處鏈接，中英兩份）；網站鏈接加渠道碼 `?from=`；同步倪師原話語料勘誤（主星南斗、北斗歸屬）。

### 上一輪更新（2026-09-21）


> **2026-10-03 補充**：倪師《天紀·紫微斗數》原話 1848 條單獨成章（第五章）；合併外部貢獻 #29（時辰序號校驗）；引擎拒絕不存在的公曆日期，數據集補字段口徑與已知問題；提交 package-lock.json；站點地址改為可配置；合盤演示改用本地引擎起盤、AI 接口缺失時明確提示；補齊貢獻指南、行為準則、問題與 PR 模板；新增英文簡介 [README.en.md](./README.en.md)；去掉兩個用不上的部署工具包（vercel CLI、@cloudflare/next-on-pages），依賴從 483 個減到 185 個；隨後升級到 Next.js 16 修掉 postcss 漏洞，GitHub 安全提醒從 51 條清零。

![本輪更新總覽](./docs/update-20260921.png)

時隔三個月，本倉庫完成一次完整更新（[PR #28](https://github.com/Renhuai123/ziwei-doushu/pull/28)，26 個文件、+2736 / −108 行）：

**1. 排盤引擎同步到線上口徑** —— `algorithm.ts` 從 181 行到 641 行，另更新 sihua / types / constants / patterns / cities / famous；新增 8 個模塊（1367 行）：

| 模塊 | 作用 |
|------|------|
| `true-solar-time.ts` | 真太陽時校正（經度差 + 均時差） |
| `dst-cn.ts` | 中國 1986–1991 夏令時 |
| `lunar-solar.ts` | 農曆 / 公曆互轉與閏月邊界 clamp |
| `school-data.ts` / `school-tables.generated.ts` / `school-config.ts` | 星曜亮度流派數據與對照表、閏月與晚子時口徑配置 |
| `shier-shen.ts` | 十二神煞 |
| `yunxian-context.ts` | 運限上下文（含童限） |

**2. 補上回歸測試與 CI** —— 此前本倉庫沒有任何測試。現在 5 條排盤迴歸，`npm test` 一條命令跑完，每次 push 與 PR 在 GitHub Actions 上自動跑。

**3. 修掉樣本時辰註釋錯位**（[#26](https://github.com/Renhuai123/ziwei-doushu/issues/26)）—— `famous.ts` 裡 11 條名人樣本有 7 條的時辰註釋與 `hour` 索引不符（`hour` 一直是**時辰地支索引 0–11**，不是 0–23 的小時數）。已改正並加回歸釘住。

**4. 積壓 issue 從 18 條清到 4 條**，留下的都是還在走的。

**5. 文檔與許可** —— 新增 [`DATASET-LICENSE`](./DATASET-LICENSE)；README 補齊引擎能力清單、維護節奏、開源邊界；修正兩處不實描述（數據集「口徑與線上完全一致」、界面「完整的 Next.js 15 前端」）。

---

## 二·新、13 維解讀數據集 v4.0（2026-10-15）

> **下載位置：本倉庫右側 [Releases → v4.0-13d](https://github.com/Renhuai123/ziwei-doushu/releases/tag/v4.0-13d)**

v4.0 用 2026-10-15 版網站斷語庫重新生成：13 個分析維度的斷語已按倪海廈《天紀》逐字稿與《紫微斗數全書》原文逐句校正——查不到出處的引文刪去或換成逐字可查的原話（倪師原話註明《天紀》集數與時間碼），不會發生的四化相關句子刪去，有條件的斷語寫明條件。

### 規格

| 項目 | 說明 |
|------|------|
| 命盤數 | **674,976 張**（公曆 1950–2026 年 × 真實每月天數 × 12 時辰 × 男女） |
| 解讀段數 | **8,774,688 段**（每張盤 13 維） |
| 維度 | 命格總覽、性格、感情、事業、財運、健康、兄弟、子女、遷移、人際、田宅、福德、父母 |
| 大小 | 解壓後 56.6 GB；壓縮後 161 MB（77 個年份文件，zstd；另有一個全年份總包 `ziwei-interp-v4-all.tar`） |
| 正文 | 約 204 億字，每張盤約 3.0 萬字 |
| 生成方式 | 排盤引擎 + 斷語庫確定性生成，不經 AI，同一輸入恆得同一輸出 |
| 內容版本 | `ca268829f7a9`（與網站同期的 ANALYSIS_CONTENT_VERSION） |

**每行一張盤**（JSON Lines），字段：

| 字段 | 含義 |
|------|------|
| `k` | 鍵：`YYYY-MM-DD-时辰序号-性别`，如 `1990-01-01-0-male` |
| `y` / `m` / `d` | **公曆**出生日期；只含真實存在的日期（不再有 2 月 30 日之類） |
| `h` | **時辰序號 0–11**（子 = 0 …… 亥 = 11），不是鐘點；對照表見上一節 |
| `g` | `male` / `female` |
| `ms` | 命宮第一顆主星；命宮無主星時為 `null` |
| `t` | 各維字數 |
| `c` | 13 維解讀全文（Markdown），鍵為 `overview` / `personality` / `love` / `career` / `wealth` / `health` / `family` / `children` / `move` / `friends` / `home` / `spirit` / `parents` |

**口徑說明**
- 是本命盤視圖的解讀；網站上按讀者當前年齡改寫的句子、各維末尾附加的倪師法則段、AI 解讀都不在數據集裡。
- 按時辰序號直接排盤，未按出生地做真太陽時校正。

### 下載與解壓

```bash
# 一次下全部：gh release download v4.0-13d --repo Renhuai123/ziwei-doushu -p "ziwei-interp-v4-all.tar"
# 只要某幾年就只下那幾年，例如 1990 年
zstd -d --long=27 year-1990.jsonl.zst          # 得到 year-1990.jsonl
shasum -a 256 -c SHA256SUMS.txt --ignore-missing # 校驗
```

`--long=27` 必須帶上（壓縮時用了長窗口）。Windows 可用 [zstd 官方發佈包](https://github.com/facebook/zstd/releases) 裡的 zstd.exe，參數相同。

### 引文說明

解讀裡引用的倪海廈《天紀》原話**不屬於本數據集的授權範圍**：它們是為說明斷語出處而註明集數與時間碼的簡短引用，著作權歸原權利人；要把這些原話單獨成批使用，按第五章倪師原話的 [CC BY-NC-SA 4.0](./docs/tianji-ziwei/LICENSE.md) 處理。《紫微斗數全書》原文屬公有領域。

### 許可

與 v3.0 相同：**CC BY 4.0，可自由商用，唯一要求是保留來源標註**（上面「引文說明」裡的倪師原話除外），完整條款見 [DATASET-LICENSE](./DATASET-LICENSE)。引用時請寫：

> 本項目使用了 **紫微斗數開源解讀數據集 v4.0**（674,976 張命盤 × 13 維）
> 來源：https://github.com/Renhuai123/ziwei-doushu
> 作者：王多魚AI

---

## 二、51.8 萬命盤樣本數據集

> **下載位置：本倉庫右側 [Releases](https://github.com/Renhuai123/ziwei-doushu/releases/tag/v3.0-samples) 頁面**

我們開源了一套完整的紫微斗數命盤樣本數據集，覆蓋 **51.8 萬種排盤組合**（年 60 × 月 12 × 日 30 × 時 12 × 性別 2），每條樣本包含完整的命盤結構和基於倪海廈體系的解讀文本。

### 2.1 數據規格

| 項目 | 說明 |
|------|------|
| 樣本數量 | **518,400 條** |
| 總大小 | 壓縮後 5.5 GB（分 3 卷），解壓後 33.1 GB |
| 體系 | 倪海廈《天紀》正統（純飛星派已下線） |
| 內容 | 命盤 JSON + 13 主題解讀文本（命格總覽、財運、事業、感情、健康等） |
| 驗證 | 男女命差異化 100%、健康含子午流注 100%、女命含婦科保養 100% |
| 口徑 | 由 **v3 版排盤引擎 + 當期斷語庫**生成；線上引擎在持續更新，新版輸出與本數據集可能有差異 |

**字段口徑**（每條樣本由 `birthInfo` 生成，常被看錯的是 `hour`）：

| 字段 | 含義 |
|------|------|
| `birthInfo.year` / `month` / `day` | **公曆**出生日期：1924–1983 年（一個完整甲子），每月取 1–30 日 |
| `birthInfo.hour` | **時辰序號 0–11**，不是 0–23 點鐘：子 = 0、丑 = 1 …… 亥 = 11 |
| `birthInfo.gender` | `male` / `female` |
| `birthInfo.longitude` | 固定 120（東經 120°，未做各地真太陽時校正） |
| 文件名 `YYYY-MM-DD-hHH-性别.json` | 其中 `hHH` 同樣是時辰序號，例如 `h11` 是亥時，不是上午 11 點 |

時辰序號與鐘點對照：

| 序號 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 時辰 | 子 | 丑 | 寅 | 卯 | 辰 | 巳 | 午 | 未 | 申 | 酉 | 戌 | 亥 |
| 鐘點 | 23–1 | 1–3 | 3–5 | 5–7 | 7–9 | 9–11 | 11–13 | 13–15 | 15–17 | 17–19 | 19–21 | 21–23 |

23:00–23:59 出生（晚子時）按次日排盤、時辰取 0；00:00–00:59 出生（早子時）按當日排盤、時辰同樣取 0。

**已知問題：約 2,520 條樣本的日期並不存在。** 生成時每個月都取了 1–30 日，所以 2 月 30 日，以及非閏年的 2 月 29 日也生成了樣本，共 105 個日期 × 12 時辰 × 2 性別 = 2,520 條，佔 0.49%。v3 引擎遇到這類日期不報錯，而是順延成 3 月 1–2 日排盤，所以這些樣本的內容與對應的 3 月 1–2 日樣本重複。使用時請過濾掉：`month = 2` 且 `day = 30`，或 `month = 2` 且 `day = 29` 且該年不是閏年。引擎從 2026-10-03 起會直接拒絕不存在的日期，下一版數據集不會再有這類樣本。

### 2.2 下載方式

前往 [Releases](https://github.com/Renhuai123/ziwei-doushu/releases/tag/v3.0-samples) 下載以下文件：

```
ziwei-samples-v3-part1.zip.001  (1.9 GB)
ziwei-samples-v3-part2.zip.002  (1.9 GB)
ziwei-samples-v3-part3.zip.003  (1.8 GB)
SHA256SUMS.txt                  (校驗文件)
```

下載後合併解壓：

```bash
# macOS / Linux
cat ziwei-samples-v3-part*.zip.* > combined.zip
unzip combined.zip

# Windows (PowerShell)
Get-Content ziwei-samples-v3-part*.zip.* -Encoding Byte -ReadCount 0 | Set-Content combined.zip -Encoding Byte
Expand-Archive combined.zip
```

### 2.3 用途

- 微調小模型的訓練語料（51.8 萬 input-output 配對）
- AI 對話的 RAG 檢索源
- 修改 `patterns.ts` 後做 A/B 基線對比
- 紫微斗數研究與數據分析

### 2.4 數據許可與引用

📂 **完全開源 · 可自由商用** —— 你可以在任何項目裡使用這套數據，包括但不限於：

- 商業產品 / SaaS / 付費應用
- AI 模型微調（開源或閉源模型均可）
- 二次開發、再分發、衍生數據集
- 學術研究、技術博客、教學課程

無需付費、無需申請、無需事先告知。

**唯一的要求是保留數據來源標註（attribution）**：

> 本項目使用了 **紫微斗數開源樣本數據集 v3.0**（518,400 條）
> 來源：https://github.com/Renhuai123/ziwei-doushu
> 作者：王多魚AI

放在哪裡都行：

- **網頁 / 產品**：About 頁 / 關於我們 / 數據來源 / 頁腳，寫一行鏈接即可
- **AI 模型**：模型卡（Model Card）或數據集卡（Dataset Card）的 "Training Data" 字段
- **學術論文**：參考文獻或致謝章節
- **二次發佈的數據集**：README 或 metadata 文件裡註明上游來源

僅此一條，其餘都自由。完整條款見 [DATASET-LICENSE](./DATASET-LICENSE)。希望這套數據能幫你做出好東西。

---

## 三、快速開始

```bash
# 克隆
git clone https://github.com/Renhuai123/ziwei-doushu.git
cd ziwei-doushu

# 安裝依賴
npm install

# 配置環境變量（只看排盤可以跳過；AI 配置僅在你自己實現了 /api/* 接口時才用得上）
cp .env.example .env.local

# 啟動開發服務器
npm run dev
```

本地驗證：

```bash
npm run typecheck   # TypeScript 全量類型檢查
npm test            # 排盤引擎迴歸（768 盤 × 紫微鐵律、夏令時、立春邊界、紅鸞天喜、樣本時辰一致性、時辰序號邊界、日期合法性、同宮雙四化）
```

每次 push 與 PR 都會在 GitHub Actions 上跑同一套（見 [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)）。

> **（上游原文；本 fork 已實作這些接口，見最上方說明）**
>
> **注意：開源版不含後端 API 路由。**排盤、命盤展示、合盤起盤都在瀏覽器裡用本倉庫的引擎完成，**不需要任何 API Key**。AI 解讀（`/api/interpret`）和合盤 AI 分析（`/api/heming`）需要你自己實現接口；沒實現之前，這兩處會直接提示「開源版不含該接口」，配置 API Key 也不會變成可用（#30 就是這個原因）。

---

## 四、排盤引擎

排盤內核全部在 `lib/ziwei/`。

### 4.1 能做到什麼（與常見排盤庫的差異）

| 能力 | 說明 |
|------|------|
| **真太陽時校正** | 按出生地經度算時差 + 均時差，避免東西向差一個時辰 |
| **中國夏令時** | 1986–1991 年的夏令時區間自動扣除 |
| **閏月四種口徑** | 閏月歸前月 / 歸後月 / 按日切分 / 按本月，可配置，不寫死一派 |
| **晚子時換日** | 23:00–23:59 按次日排盤、00:00–00:59 按本日；換日策略可切換 |
| **星曜亮度 7 檔** | 廟 / 旺 / 得 / 利 / 平 / 不 / 陷，另保留 3 檔粗分類做顯示降級 |
| **亮度流派可切換** | 不同流派（含主流排盤軟件的不同版本）對輔星亮度判法不一致，做成開關而非寫死 |
| **四化與飛星** | 生年四化、大限 / 流年四化、飛星自化 |
| **十二神煞** | 本命層按生年支起，流年層改按流年支起 |
| **格局判定** | 1100+ 行規則庫（紫府同宮、日月並明、七殺朝斗等） |

### 4.2 文件怎麼分

| 文件 | 說明 |
|------|------|
| `algorithm.ts` | 完整排盤流程：安命宮、定五行局、安十四主星、安輔星、排大限流年 |
| `constants.ts` | 天干地支、十四主星、輔星常量 |
| `sihua.ts` | 四化飛星系統（祿權科忌），含各天干四化對照表 |
| `patterns.ts` | **1100+ 行格局知識庫**：紫府同宮、日月並明、七殺朝斗等經典格局判定規則 |
| `heming-knowledge.ts` | 合盤方法論：倪師體系下雙盤比對邏輯 |
| `types.ts` | TypeScript 類型定義 |
| `cities.ts` | 中國城市經緯度，用於真太陽時校正 |
| `famous.ts` | 歷史名人命盤示例數據 |
| `school-data.ts` / `school-tables.generated.ts` / `school-config.ts` | 星曜亮度流派數據與對照表、閏月與晚子時口徑配置 |
| `shier-shen.ts` | 十二神煞（本命按生年支起、流年層按流年支起） |
| `true-solar-time.ts` | 真太陽時校正（經度差 + 均時差） |
| `dst-cn.ts` | 中國 1986–1991 夏令時年份與區間 |
| `yunxian-context.ts` | 運限上下文（含童限處理） |
| `lunar-solar.ts` | 農曆 / 公曆互轉與閏月邊界 clamp |

### 4.3 古籍原文（`lib/classics/`）

- **骨髓賦**（`gusuifu.ts`）— 紫微斗數核心歌訣
- **紫微斗數全集**（`quanji.ts`）— 清代古本
- **紫微斗數全書**（`quanshu.ts`）— 陳希夷傳本

### 4.4 SEO 知識圖譜（`lib/seo/`）

14 主星 × 12 宮位的結構化知識數據，可用於內容生成或知識庫構建。

---

## 五、倪師《天紀·紫微斗數》原話

![倪海廈《天紀·紫微斗數》一圖看全](./docs/tianji-ziwei/overview.png)

倪海廈《天紀》紫微斗數部分的原話共 **1848 條**：正課 14 講（第 2–15 講上半）加 2 段補充，按講分成 16 個文件，放在 [`docs/tianji-ziwei/`](./docs/tianji-ziwei/)。每條都帶出處時間，點一下就跳回 B 站原視頻的那一秒。

- **怎麼讀**：先在上圖裡找到想看的主題，再點進對應那一講，比如 [5上](./docs/tianji-ziwei/5%E4%B8%8A.md)（紫微在子）、[13上](./docs/tianji-ziwei/13%E4%B8%8A.md)（殺破狼、科權祿三會）。
- **從哪來**：取自姊妹倉庫 [nihai-tianji-corpus](https://github.com/Renhuai123/nihai-tianji-corpus)，以語料庫為準，會隨語料庫同步。
- **能不能商用**：**不能**。這一章的內容單獨採用 CC BY-NC-SA 4.0，詳見[九、協議](#九協議)。

---

## 六、界面是一份 Demo

界面代碼在 `app/` 與 `components/`。倉庫裡的界面是**一套最小可運行示例**，作用是把排盤引擎跑起來、把盤畫出來，方便你在它基礎上做自己的產品。**線上商業版的界面不在開源範圍內**，兩者差距很大：

| 頁面 / 組件 | 本倉庫（Demo） | 線上商業版 |
|------|------|------|
| 排盤頁 `app/chart/page.tsx` | 75 行 | 1227 行 |
| 解讀面板 `InsightPanel` | 467 行 | 5088 行 |
| 命盤方格 `ChartBoard` | 285 行 | 1334 行 |
| 宮位格 `PalaceCell` | 201 行 | 1192 行 |
| 合盤頁 `app/heming/page.tsx` | 368 行 | 1937 行 |

**Demo 能跑通的**：出生信息表單、命盤方格與宮位詳情、本命 / 大限 / 流年切換、古籍閱讀器（全文搜索）、命理百科（14 主星 × 12 宮位）、亮暗主題、移動端適配。

**Demo 裡沒有的**：線上重做過的交互界面、AI 流式解讀、合盤圖譜、分享卡片，以及**斷語內容本身**（`db-analysis.ts` 是佔位實現）。也就是說，Demo 畫得出盤，但給不出線上那套解讀。

---

## 七、開源邊界：什麼不在裡面

| | 內容 |
|---|---|
| ✅ **開源** | 排盤引擎（`lib/ziwei/`）、古籍公版原文（`lib/classics/`）、SEO 知識圖譜（`lib/seo/`）、Demo 界面、51.8 萬樣本數據集、13 維解讀數據集 v4.0 |
| ❌ **不開源** | 斷語庫（`lib/ziwei/db-analysis.ts` 是佔位，線上是上萬行的 13 主題斷語）、AI 解讀 prompt、後端 API（`/api/interpret` 等）、用戶系統（登錄 / 會員 / 支付）、服務端安全（簽名、防刷、水印）、部署配置 |

如果你需要 AI 解讀能力，可以參考 `lib/ziwei/patterns.ts` 和 `heming-knowledge.ts` 裡的知識庫，結合任意 LLM 自行構建 prompt。

---

## 八、維護節奏與貢獻

這個倉庫是**排盤引擎 + 數據集的開放快照**，不是一個全職維護的開源產品，說清楚免得大家猜：

- **引擎同步**：隨線上發版同步 `lib/ziwei/` 的引擎層並打 tag；斷語庫、AI 解讀、商業站前端不在同步範圍內。
- **Issue**：會看，但回覆可能不及時；帶復現步驟或具體盤例（年月日時 + 性別 + 哪一條不對）的問題優先處理。
- **PR**：歡迎，尤其是迴歸測試、口徑修正、文檔。動到排盤口徑的改動請附上依據（古籍原文或可核對的對照）。

---

## 九、協議

本倉庫分四部分授權。前三部分是寬鬆協議，**商用沒有限制**；倪師原話目錄**不許商用**：

| 內容 | 協議 | 簡單說 |
|------|------|--------|
| **代碼**（`lib/`、`app/`、`components/`） | [MIT License](./LICENSE) | 拿去隨便用，保留 LICENSE 文件即可 |
| **數據**（Releases 中的 51.8 萬樣本數據集 v3.0、13 維解讀數據集 v4.0） | [CC BY 4.0](./DATASET-LICENSE) · 要求 attribution | 商用也行，**註明數據來源即可** |
| **古籍原文**（骨髓賦、紫微斗數全集 / 全書等） | Public Domain | 古書都是公有領域，不存在版權 |
| **倪師原話**（[`docs/tianji-ziwei/`](./docs/tianji-ziwei/)） | [CC BY-NC-SA 4.0](./docs/tianji-ziwei/LICENSE.md) | 可以引用、轉載，註明出處；**不許商用**，改編後用同樣協議 |

**一句話**：代碼和數據拿去用，商用也行，把來源鏈接帶上就行；倪師原話只限非商業的學習研究（數據集解讀裡引用的倪師原話同樣不在數據授權範圍內）。

---

## 十、關於與贊助

### 項目理念

紫微斗數是中國傳統命理學的瑰寶，倪海廈老師在《天紀》中系統梳理了正宗的紫微斗數體系。我們希望通過技術手段讓更多人接觸和學習這門學問。

開源排盤算法和知識庫，是因為我們相信：**算法是公開的傳統智慧，不應該被鎖在圍牆裡**。真正的價值在於解讀的深度、用戶體驗的打磨、以及持續運營的積累。

想自己搭？代碼都在這裡，拿去用。嫌麻煩？來 [metisziwei.com](https://metisziwei.com/?from=gh-readme) 直接用。

### 技術棧

- **框架**：Next.js 16（App Router）
- **語言**：TypeScript
- **樣式**：Tailwind CSS + CSS Variables 設計系統
- **排盤**：基於 [iztro](https://github.com/SylarLong/iztro) + lunar-javascript
- **動畫**：Framer Motion

### 贊助

覺得這個 fork 有用，歡迎贊助維護（綠界金流：信用卡、ATM、超商代碼）。

<a href="https://donate.twater.cc/r/ziwei"><img src="./docs/assets/donate-qr.svg" alt="贊助 QR Code：https://donate.twater.cc/r/ziwei" width="180" height="180"></a>

掃描 QR Code 或前往 **<https://donate.twater.cc/r/ziwei>**。

本 fork 的原始成果來自上游作者，請見 [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu)。
