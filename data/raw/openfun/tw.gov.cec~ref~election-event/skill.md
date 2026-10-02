---
reviewed_by:
  rd: Ronny
  pm: Zoe
---
# `tw.gov.cec~ref~election-event` — 歷次投票事件清單

> **給 AI 閱讀的資料集說明。**
> 人類可在 https://data.openfun.tw/datasets/tw.gov.cec~ref~election-event 看到同份內容的網頁版。
> 詳細資料知識見 [knowledge.md](knowledge.md)。

---

## 資料來源與更新頻率

| 項目 | 說明 |
|------|------|
| 原始來源 | 選舉資料庫(含選舉區資料)（[連結](https://data.gov.tw/dataset/13119)） |
| 授權 | [政府資料開放授權條款-第1版](https://data.gov.tw/dataset/13119) |
| 更新頻率 | on-demand |

建議標注：CC-BY 歐噴資料庫,中央選舉委員會

## ⚠️ 開始之前（AI agent 必讀，摘要也請保留這段）

資料集 slug：tw.gov.cec~ref~election-event
API 端點：https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~election-event/records
認證方式（必填）：HTTP Header Authorization: Bearer {token}

最簡查詢範例：`curl -H "Authorization: Bearer YOUR_TOKEN" "https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~election-event/records?per_page=20"`

**Token 是必要條件，沒有 Token 就無法查資料。**
如果使用者沒有 Token，請先請使用者前往 https://data.openfun.tw/user 申請。

禁止抓取 HTML 頁面（本平台有 bot 保護）。

授權標注：使用此資料產出的內容需標注「資料來源：歐噴資料庫（data.openfun.tw）／中央選舉委員會」

---

## 這份資料集能回答什麼問題

以下問題，這份資料集**可以回答**：

- 「第 16 任總統選舉是哪一天？」→ 2024-01-13（`vote_id=ELC-P0-16`）
- 「歷年立委選舉一覽」
- 「2024 年有哪些投票事件？」
- 「補選總共辦過幾次？」（每個選區缺額補選各一筆）
- 「2023 年有哪些補選？」

以下問題，這份資料集**無法回答**：

- 「某選舉的候選人有誰、得票多少？」（請查 tw.gov.cec~ref~candidates；得票數待另外補件）
- 「選區劃分」（中選會選舉區資料待另收錄）

---

## 欄位說明

| 欄位名稱 | 型別 | 說明 |
|---------|------|------|
| `vote_id` | keyword（_id） | 投票代碼（主鍵），格式 `{TYPE}-{LEVEL}-{屆次}`，例 `ELC-P0-16` |
| `vote_name` | text（_name） | 投票名稱中文，例 `第16任總統副總統選舉` |
| `vote_type_id` | keyword（篩選器、ref: [tw.gov.cec~ref~election-type](../tw.gov.cec~ref~election-type/skill.md)） | 投票種類代碼：`ELC`（選舉）、`BEL`（補選）、`RCL`（罷免）、`REF`（公投） |
| `vote_level_id` | keyword（篩選器、ref: [tw.gov.cec~ref~election-level](../tw.gov.cec~ref~election-level/skill.md)） | 投票層級代碼：`P0`/`L0`/`C1`/`C2`/... |
| `vote_date` | date | 投票日期（西元 `YYYY-MM-DD`） |
| `source` | text | 資料來源 URL |

---

## `vote_id` 命名規則

**ELC（一般選舉）：** `{TYPE}-{LEVEL}-{屆次或年度}`

- 全國性選舉（總統、立委）：屆次數字。例 `ELC-P0-16`（第 16 任總統）、`ELC-L0-11`（第 11 屆立委）
- 地方選舉：以民國年標示。例 `ELC-C1-111`（111 年直轄市長選舉）

**BEL（補選）：** `BEL-{LEVEL}-{屆次或年度}:{date}:{area_code}`

每個選區缺額補選各有獨立一筆（不同日期、不同選區分開）。格式較複雜：

- `{date}` 依層級而異：全國性補選（立委等）為**就職日**，地方性補選（村里長等）為**投票日**，均為 YYYYMMDD 格式
- `{area_code}` 依層級而異：立委等為 `{縣市代碼}-{選區號}`（6+1 碼），村里長等為 11 碼 RIS 村里代碼

範例：
- `BEL-L0-9:20160201:63000-2`（第 9 屆立委臺北市第 2 選區缺額補選，2016-02-01 就職日）
- `BEL-V0-111:20240817:10008070007`（111 年選出的南投縣某村長補選，2024-08-17 投票）

⚠️ **BEL vote_id 不能用簡單規則推算**，需透過 API 查詢或以日期篩選確認。

---

## 標準流程

### Step 1：找出某類選舉的清單

```bash
# 歷年總統副總統選舉
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~election-event/records?vote_type_id=ELC&vote_level_id=P0&per_page=30"

# 歷年立委選舉
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~election-event/records?vote_type_id=ELC&vote_level_id=L0&per_page=30"

# 所有補選（BEL，建議加 vote_level_id 縮小範圍）
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~election-event/records?vote_type_id=BEL&vote_level_id=L0&per_page=50"

```

### Step 2：以特定日期查詢

```bash
# 查 2022-11-26 舉辦的投票事件（九合一當天）
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~election-event/records?vote_date=2022-11-26&per_page=20"
```

### Step 3：以 vote_id 找其他資料

```bash
# 確認該投票事件
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~election-event/records/ELC-P0-16"

# 之後可帶 vote_id（= 選舉代碼）去查相關資料集：
#   候選人名單   tw.gov.cec~ref~candidates           ?選舉代碼={vote_id}
#   候選人得票   tw.gov.cec~txn~candidates-votes     ?選舉代碼={vote_id}&行政區層級=national
#   投票概況     tw.gov.cec~txn~votes-geo            ?選舉代碼={vote_id}&選區代碼=00&行政區層級=national
#   不分區政黨   tw.gov.cec~ref~party                ?選舉代碼={vote_id}
```

### Step 4：找不到對應紀錄時

1. 中選會 db.cec.gov.tw 資料涵蓋自民國 84 年（1995）至今；更早期之選舉本資料集未收錄。
2. 若查無結果，確認該類型是否已收錄，或洽歐噴公司詢問。
3. 「九合一」是俗稱，不是單一 `vote_id`；要查 2022 年九合一，請以 `vote_date=2022-11-26` 篩選，會得到約 9 筆同日不同層級的投票事件。

---

## API 呼叫範例

### 查全部某層級投票事件

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~election-event/records?vote_level_id=C1&per_page=50"
```

### 全文搜尋（補選名稱）

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~election-event/records?q=臺北市&vote_type_id=BEL&per_page=20"
```

### 批次查多個 vote_id

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~election-event/records?_ids=ELC-P0-16,ELC-P0-15,ELC-P0-14"
```

---

## 關聯資料集

| 資料集 | 說明 | 用途 |
|--------|------|------|
| [`tw.gov.cec~ref~election-type`](../tw.gov.cec~ref~election-type/skill.md) | 投票種類代碼 | 還原 `vote_type_id` 中文名稱 |
| [`tw.gov.cec~ref~election-level`](../tw.gov.cec~ref~election-level/skill.md) | 選舉層級代碼 | 還原 `vote_level_id` 中文名稱 |
| [`tw.gov.cec~ref~candidates`](../tw.gov.cec~ref~candidates/skill.md) | 中選會候選人資料 | 以 `vote_id`（= `選舉代碼`）JOIN 取得候選人清單 |
| [`tw.gov.cec~txn~candidates-votes`](../tw.gov.cec~txn~candidates-votes/skill.md) | 候選人得票數 | 以 `選舉代碼`（= `vote_id`）篩選各候選人各層級得票 |
| [`tw.gov.cec~txn~votes-geo`](../tw.gov.cec~txn~votes-geo/skill.md) | 各選區投票概況 | 以 `選舉代碼`（= `vote_id`）篩選選舉人數／投票率／廢票 |
| [`tw.gov.cec~ref~party`](../tw.gov.cec~ref~party/skill.md) | 不分區政黨參選 | 立委選舉以 `選舉代碼`（= `vote_id`）篩選參選政黨 |
| [`tw.openfun~bulk~campaign-finance`](../tw.openfun~bulk~campaign-finance/skill.md) | 政治獻金申報 | 該檔的 `選舉名稱` 為文字格式（如 `113年立法委員選舉`），可對照本資料集還原 `vote_id` |

---

## 注意事項與限制

1. **涵蓋範圍：1995 年至今**：中選會選舉資料庫起始於民國 84 年（1995）的選舉，更早資料本資料集未收錄。
2. **同日多場投票**：如 2022 年九合一（縣市長、議員、鄉鎮市長、村里長…）為同日舉辦但屬不同 `vote_id`。
3. **歷史層級**：`P9`（臺灣省長）、`T9`（臺灣省議員）、`N0`（國大代表）等歷史層級可能存在於本資料集，但對應的選舉已停辦。
4. **`vote_id` 是穩定主鍵**：可作為跨資料集 JOIN 的穩定鍵；不要用 `vote_name` 做主鍵，名稱可能因格式微調而變化。

---

## 快速參考

| 項目 | 說明 |
|------|------|
| Records URL | `https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~election-event/records` |
| 認證 | `Authorization: Bearer {token}` 必填 |
| 總筆數 | 約 938 |
| 主鍵 | `vote_id` |
| 可篩選欄位 | `vote_type_id`、`vote_level_id`、`vote_date` |
| 涵蓋範圍 | 民國 84 年（1995）至今 |
| `vote_type_id` 可能值 | `ELC`、`BEL`、`RCL`、`REF` |
| ELC `vote_id` 格式 | `{TYPE}-{LEVEL}-{屆次或民國年}` |
| BEL `vote_id` 格式 | `BEL-{LEVEL}-{屆次}:{date}:{area_code}`（每選區各一筆） |
| 用途 | 選舉事件 metadata；可作為其他選舉相關資料集的 JOIN key |