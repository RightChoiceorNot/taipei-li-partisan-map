---
reviewed_by:
  rd: Ronny
  pm: Zoe
---
# `tw.gov.cec~ref~election-event` — 歷次投票事件清單

版本：2026-05　最後更新：2026-05-20　維護：歐噴資料（data.openfun.tw）　授權：CC-BY 4.0 International　原始資料授權：政府資料開放授權條款 OGDL-Taiwan-1.0

## 資料集概述

中華民國中央選舉委員會自民國 84 年（1995）至今所舉辦之投票事件清單，涵蓋選舉（ELC）、補選（BEL）、罷免（RCL）、公投（REF）。是時間序列分析、跨年代選舉比較、與其他選舉相關資料集（候選人、得票、政治獻金）JOIN 的核心 metadata。

適合用途：建構選舉時間軸、整理某層級的歷屆名單、依日期定位投票事件、作為跨資料集 JOIN key。

## 資料來源

| 項目 | 說明 |
|------|------|
| 原始資料 | 中央選舉委員會「選舉資料庫」（含選舉區資料）https://db.cec.gov.tw |
| 整理來源 | 歐噴資料庫（data.openfun.tw） |
| 原始授權 | 政府資料開放授權條款－第 1 版（OGDL-Taiwan-1.0） |
| 引用標示 | CC-BY 歐噴資料庫,中央選舉委員會 |
| 涵蓋時間 | 民國 84 年（1995）至今 |
| 總筆數 | 約 938 |
| 更新頻率 | on-demand（每次選後更新） |

## 法源依據

- 《公職人員選舉罷免法》
- 《總統副總統選舉罷免法》
- 《公民投票法》
- 《地方制度法》

## 涵蓋範圍

按 `vote_type_id` 與 `vote_level_id` 分類：

**全國性選舉**（`P0`、`L0`）
- 總統副總統選舉：第 9 任（1996）至最新一屆
- 立法委員選舉：第 3 屆（1995）至最新一屆

**地方選舉**（`C1`、`C2`、`T1`、`T2`、`D2`、`D1`、`R2`、`R1`、`V0`）
- 直轄市長、縣市長、議員
- 鄉鎮市長、鄉鎮市民代表、村里長
- 直轄市山地原住民區長／代表（103 年地制法修正後新增）

**補選**（`BEL`）：各層級不定期之缺額補選，每個選區各一筆。

**罷免**（`RCL`）與**公投**（`REF`）：代碼定義見 tw.gov.cec~ref~election-type。

**歷史層級**：`P9`（臺灣省長，1994 唯一一次）、`T9`（臺灣省議員，精省前）、`N0`（國大代表，2005 廢除前）

## 資料特性與限制

### 資料準確性

資料來源為中選會選舉資料庫，為官方原始資料。本資料集為定期同步快照，可能與最新公告之資料略有時間差。

### 涵蓋範圍說明

- **有涵蓋**：1995 年至今之選舉（ELC）、補選（BEL）、罷免（RCL）、公投（REF）
- **可能未涵蓋**：1995 年前的選舉、未由中選會主辦之內部選舉（如黨內初選、職業團體選舉）
- **不涵蓋（屬其他資料集）**：選區劃分細節、候選人個資、得票數

### 常見誤用與注意事項

1. **「九合一」非單一事件**：九合一選舉為同日舉辦的 9 種層級選舉之統稱，每種層級各為獨立 `vote_id`。要查 2022 九合一請用 `vote_date=2022-11-26` 篩選，會得到約 9 筆。
2. **補選的 vote_id 格式複雜**：BEL 的 vote_id 不是簡單的「屆次-序號」格式，而是包含日期碼與選區代碼，例如 `BEL-L0-9:20160201:63000-2`（第9屆立委臺北市第2選區補選）。每個選區缺額補選各有獨立一筆，不同層級的日期碼意義也不同（全國性補選用就職日，地方性補選用投票日）。**不可用簡單規則推算 BEL vote_id，需透過 API 查詢。**
3. **歷史層級會出現在資料中**：如 `P9-1`（臺灣省長選舉）、`N0-1` 等歷史已停辦選舉的紀錄仍會保留在本資料集中。
4. **`vote_date` 為投票當日**：不是「選舉登記日」、「公告日」或「就職日」。
5. **與政治獻金 JOIN**：`tw.openfun~bulk~campaign-finance` 的 `選舉名稱` 為文字（如 `113年立法委員選舉`），與本資料集的 `vote_name`（如 `第11屆立法委員選舉`）格式不同。對應時建議以 `vote_date` 與屆次／年度比對。

## 欄位說明

### `vote_id`

投票代碼，主鍵。格式 `{vote_type_id}-{vote_level_id}-{屆次或年度}`。

**ELC 範例：**
- `ELC-P0-16` 第 16 任總統副總統選舉
- `ELC-L0-11` 第 11 屆立法委員選舉
- `ELC-C1-111` 111 年直轄市長選舉

**BEL 範例（格式：`BEL-{LEVEL}-{屆次}:{date}:{area_code}`）：**
- `BEL-L0-9:20160201:63000-2` 第9屆立委臺北市第2選區缺額補選（日期碼為就職日）
- `BEL-L0-9:20160201:65000-3` 第9屆立委新北市第3選區缺額補選
- `BEL-V0-111:20240817:10008070007` 111年南投縣鹿谷鄉竹豐村第22屆村長補選（日期碼為投票日）

**RCL/REF：** 代碼有定義但 tw.gov.cec~ref~election-event 目前無任何此類紀錄。

### `vote_name`

中文名稱，自由文字。範例：`第16任總統副總統選舉`、`111年直轄市長選舉`、`111年第18案至第20案全國性公民投票`。

### `vote_type_id`

對應 [`tw.gov.cec~ref~election-type`](../tw.gov.cec~ref~election-type/knowledge.md)。值包括 `ELC`（選舉）、`BEL`（補選）、`RCL`（罷免）、`REF`（公投）。

### `vote_level_id`

對應 [`tw.gov.cec~ref~election-level`](../tw.gov.cec~ref~election-level/knowledge.md)。值為 `P0`／`L0`／`C1`／`C2`／`T1`／`T2`／`D2`／`D1`／`R2`／`R1`／`V0`／`N0`／`P9`／`T9`。

### `vote_date`

投票日期，西元 `YYYY-MM-DD`。

### `source`

該筆資料的原始來源 URL，多為 `https://db.cec.gov.tw`。

## 相關資料集與主題

| 類型 | 連結 | 關聯說明 |
|------|------|----------|
| 資料集 | [`tw.gov.cec~ref~election-type`](../tw.gov.cec~ref~election-type/knowledge.md) | 投票種類代碼參照表 |
| 資料集 | [`tw.gov.cec~ref~election-level`](../tw.gov.cec~ref~election-level/knowledge.md) | 選舉層級代碼參照表 |
| 資料集 | [`tw.gov.cec~ref~candidates`](../tw.gov.cec~ref~candidates/knowledge.md) | 候選人資料，以 `vote_id`（= `選舉代碼`）JOIN |
| 資料集 | [`tw.gov.cec~txn~candidates-votes`](../tw.gov.cec~txn~candidates-votes/knowledge.md) | 候選人各層級得票數，`選舉代碼` 引用 `vote_id` |
| 資料集 | [`tw.gov.cec~txn~votes-geo`](../tw.gov.cec~txn~votes-geo/knowledge.md) | 各選區投票概況，`選舉代碼` 引用 `vote_id` |
| 資料集 | [`tw.gov.cec~ref~party`](../tw.gov.cec~ref~party/knowledge.md) | 不分區政黨參選，`選舉代碼` 引用 `vote_id` |
| 資料集 | [`tw.openfun~bulk~campaign-finance`](../tw.openfun~bulk~campaign-finance/knowledge.md) | 政治獻金，可依年度／屆次對應 |
| 資料集 | [`tw.gov.moi~ref~party`](../tw.gov.moi~ref~party/knowledge.md) | 政黨資料 |

## 更新頻率與版本記錄

| 版本 | 更新日期 | 說明 |
|------|----------|------|
| 2026-05 | 2026-04-17 | 資料更新 |
| 2026-05 | 2026-05-20 | 知識文件初始建立 |
| 2026-05 | 2026-05-21 | 更新 vote_type_id 說明；補上 BEL vote_id 完整格式說明（含日期碼與選區代碼） |

## AI 使用指引

AI agent 使用指引見 [skill.md](skill.md)。
