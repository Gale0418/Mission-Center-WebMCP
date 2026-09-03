# Product

## Platform

web

## Users

主要使用者是在單一 repository 內操作 Codex Mission Center 的個人開發者或專案操作者。他們需要迅速看出目前最需要介入的事項，並追蹤任務、代理與驗證證據。

## Product Purpose

Codex Mission Center 是離線、per-project、檔案核心的任務作業系統，將模糊目標收斂成可驗證、可交接、可恢復的本地任務工作區。HUD 是這套工作區的唯讀戰情表面；成功代表操作者能依序掌握異常與待處理事項、任務進度、Agent 狀態與證據追溯，而不必猜測資料新鮮度。

## Positioning

產品以 repository 中可檢查、可版本化的 MissionCenter 文件與 `tasks.md` 作為生命週期真相；可選的 loopback runtime 只顯示明確連接 endpoint 的遙測。它不是全域 Codex Desktop 監控器，也不建立第二套任務狀態來源。

## Product Principles

1. Attention first：第一眼先回答哪裡需要人介入。
2. Truth before theatre：寧可顯示 unavailable 或 stale，也不製造即時感。
3. Task truth stays singular：Runtime 只補充上下文，不改寫任務生命週期。
4. Progressive disclosure：總覽保持可掃描，細節在明確操作後展開。
5. Evidence remains traceable：狀態與宣稱應可回溯至本地文件、schema、測試或 smoke evidence。

> Snapshot note: this compact copy preserves the upstream product contract used by the challenge build. The exact source is `PRODUCT.md` at commit `1d032c4708eb198259a4ea625a7d731b5277e431`.
