# 參與貢獻

歡迎提問題、提修復、提建議。先說清兩件事，能省掉很多來回：

- 本倉庫是 [metisziwei.com](https://metisziwei.com/?from=gh-contrib) 排盤引擎的**開源快照**，定期從線上同步（節奏見 README「維護節奏與貢獻」）。
- 開源版**不含**斷語庫、AI 解讀提示詞和任何 `/api/*` 後端接口（見 README「開源邊界」）。AI 解讀、合盤分析在開源版裡返回 404 是預期行為，需要你自己實現。

## 提問題

- **怎麼用、想交流**：去 [討論區](https://github.com/Renhuai123/ziwei-doushu/discussions)。
- **覺得盤排得不對**：用「排盤結果疑問」模板，附上公曆出生日期、幾點幾分、出生地或經度、性別、本項目的結果，以及你拿來對照的結果。只寫「不準」我們沒法查。
  - 輔星亮度、閏月歸屬、晚子時是否換日，各流派本來就不同，引擎裡做成了可切換的口徑；這類差異不算 bug，但歡迎指出。
- **程序報錯、頁面異常**：用「程序問題」模板，寫清復現步驟和報錯。
- **正式站（metisziwei.com）的問題**：用「正式站問題」模板。

請不要在 issue 裡貼手機號、驗證碼，或未經本人同意的他人生辰信息。

## 提交代碼

```bash
npm ci               # 按 package-lock.json 安裝
npm run typecheck    # 類型檢查
npm test             # 排盤迴歸
```

- 一個 PR 只做一件事，說明裡寫清改了什麼、為什麼。
- **改排盤結果的**：附上對照證據（出處，或其他排盤軟件的截圖），並在 `scripts/regression/` 加回歸測試、登記到 `package.json` 的 `test` 腳本。沒有出處的口徑改動一般不收。
- CI 會在每次 push 和 PR 上跑同一套檢查。

## 許可

提交即表示你同意貢獻內容按對應協議發佈：

- 代碼：[MIT](./LICENSE)
- 樣本數據集：[CC BY 4.0](./DATASET-LICENSE)
- 倪師原話目錄 `docs/tianji-ziwei/`：[CC BY-NC-SA 4.0](./docs/tianji-ziwei/LICENSE.md)，不許商用

---

**English.** Issues and PRs are welcome. This repo is an open snapshot of the charting engine behind metisziwei.com; the interpretation database, AI prompts and all `/api/*` backend routes are not included, so AI features return 404 by design. For a chart you believe is wrong, please use the "Chart result question" form with full birth data and a reference result. Before opening a PR, run `npm ci`, `npm run typecheck` and `npm test`; changes to chart results need evidence and a regression test.
