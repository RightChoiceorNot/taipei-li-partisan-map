---
reviewed_by:
  rd: yo
  pm: Zoe
---
# `tw.gov.cec~txn~candidates-votes` — 中選會候選人得票數

> **給 AI 閱讀的資料集說明。**
> 人類可在 https://data.openfun.tw/datasets/tw.gov.cec~txn~candidates-votes 看到同份內容的網頁版。
> 詳細資料知識見 [knowledge.md](knowledge.md)。

---

## 資料來源與更新頻率

| 項目 | 說明 |
|------|------|
| 原始來源 | 政府資料開放平台 - 選舉資料庫(含選舉區資料)（[連結](https://data.gov.tw/dataset/13119)） |
| 授權 | [政府資料開放授權條款－第 1 版](https://data.gov.tw/dataset/13119) |
| 更新頻率 | 每週更新 |

建議標注：CC-BY 歐噴資料庫, 中選會, 政府資料開放平台

## ⚠️ 開始之前（AI agent 必讀，摘要也請保留這段）

資料集 slug：tw.gov.cec~txn~candidates-votes
API 端點：https://data.openfun.tw/api/v1/datasets/tw.gov.cec~txn~candidates-votes/records
認證方式（必填）：HTTP Header Authorization: Bearer {token}

最簡查詢範例：`curl -H "Authorization: Bearer YOUR_TOKEN" "https://data.openfun.tw/api/v1/datasets/tw.gov.cec~txn~candidates-votes/records?候選人代碼=ELC-L0-11:09020-1:1&行政區層級=national"`

**Token 是必要條件，沒有 Token 就無法查資料。**
如果使用者沒有 Token，請先請使用者前往 https://data.openfun.tw/user 申請。

⚠️ **資料量極大（逾 300 萬筆）**：務必加篩選條件（`候選人代碼`、`選舉代碼`、`行政區層級` 等），切勿無條件全表掃描。

禁止抓取 HTML 頁面（本平台有 bot 保護）。

授權標注：使用此資料產出的內容需標注「資料來源：歐噴資料庫（data.openfun.tw）／中央選舉委員會」

---

## 這份資料集能回答什麼問題

**可以回答：**
- 「某候選人在某次選舉得幾票？」（取 `行政區層級=national`）
- 「某候選人在各縣市／鄉鎮／村里的得票分布？」（取對應 `行政區層級`）
- 「某選區某次選舉各候選人得票？」
- 「某鄉鎮市區在某次選舉有哪些候選人參選？各得幾票？」（用行政區代碼篩，不知代碼時先查 `tw.openfun~entity~geo`）

**無法回答：**
- 「投票率、選舉人數、廢票數」（請查 [`tw.gov.cec~txn~votes-geo`](../tw.gov.cec~txn~votes-geo/skill.md)）
- 「候選人姓名、政黨、性別」（請 JOIN [`tw.gov.cec~ref~candidates`](../tw.gov.cec~ref~candidates/skill.md)）
- 「不分區政黨得票」（請查 [`tw.gov.cec~txn~party-votes`](../tw.gov.cec~txn~party-votes/skill.md)）

---

## 欄位說明

| 欄位名稱 | 型別 | 說明 |
|---------|------|------|
| `識別碼` | keyword（_id） | 格式 `{候選人代碼}:{第三段}`；第三段於 `village` 層為 `投開票所識別碼`、其餘層為 `行政區代碼`；national 層行政區代碼為空，故結尾為 `:` |
| `候選人代碼` | keyword（篩選器、ref: [tw.gov.cec~ref~candidates](../tw.gov.cec~ref~candidates/skill.md)） | 候選人主鍵，格式 `{選舉代碼}:{選區代碼}:{號次}`；原住民立委候選人之中段為 `平地原住民` 或 `山地原住民` |
| `選舉代碼` | keyword（篩選器、ref: [tw.gov.cec~ref~election-event](../tw.gov.cec~ref~election-event/skill.md)） | 對應 election-event 的 `vote_id` |
| `行政區層級` | keyword（篩選器） | `village` / `town` / `county` / `national` |
| `行政區代碼` | keyword（篩選器、ref: tw.openfun~entity~geo） | 鄉鎮 8 碼、縣市 5 碼；national 為空。**`village` 層有 `投開票所識別碼` 時此欄留空**（地理歸屬改用 `投開票所識別碼`）；無票所資訊時才 fallback 填村里 `{8碼}-{3碼}` |
| `投開票所識別碼` | keyword（篩選器、ref: [tw.gov.cec~ref~polling-station](../tw.gov.cec~ref~polling-station/skill.md)） | **僅 `village` 層有值**。對應 polling-station `識別碼`；村里層每列即一個投開票所，串 polling-station 取涵蓋村里（可多村里） |
| `選區` | text | 選區名稱；national 層為 `全國`；村里層為該投開票所涵蓋村里（頓號串） |
| `選區.代碼` | keyword（篩選器） | 選區代碼；**原住民立委候選人此欄為空字串**（要查原住民候選人改用 `候選人代碼` 篩） |
| `得票數` | integer | 該行政區（或彙總層）得票數；村里層為該投開票所整體得票 |

---

## ⚠️ 層級不可相加

`village` / `town` / `county` / `national` 是**同一票的不同彙總粒度**，彼此重複。

- 要某候選人**總得票** → 取 `行政區層級=national` 那一筆。
- 要**地理分布** → 取單一層級（如全部 `county`），不要混層也不要把細層加總成總計。

---

## 查詢範例

### 範例 1：查某候選人總得票

```bash
# 第 11 屆立委 金門縣第1選區 1 號候選人的全國總得票
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~txn~candidates-votes/records?候選人代碼=ELC-L0-11:09020-1:1&行政區層級=national"
```

### 範例 2：查某候選人各縣市得票分布

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~txn~candidates-votes/records?候選人代碼=ELC-L0-11:09020-1:1&行政區層級=county&per_page=100"
```

### 範例 3：查某行政區某次選舉所有候選人得票

```bash
# 某鄉鎮（8碼行政區代碼）某次選舉的候選人得票
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~txn~candidates-votes/records?選舉代碼=ELC-D2-87&行政區代碼=10005110&行政區層級=town&per_page=200"
```

**⚠️ 只知道地名（如「板橋」），不知道代碼時：**

先用 `tw.openfun~entity~geo` 查詢地名取得 8 碼代碼，再帶入本端點：

```bash
# Step 1：查「板橋」的行政區代碼
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?q=板橋&level=town&per_page=10"
# → 取得 65000010（新北市板橋區）；注意同名地點可能有多筆，確認縣市後再用

# Step 2：查 2024 立委選舉板橋區所有候選人得票
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~txn~candidates-votes/records?選舉代碼=ELC-L0-11&行政區代碼=65000010&行政區層級=town&per_page=50"
```

結果只有 `候選人代碼` 和 `得票數`；要取得姓名、政黨等，以 `候選人代碼` JOIN `tw.gov.cec~ref~candidates`（見範例 4）。

### 範例 4：取得候選人姓名與政黨（JOIN）

```bash
# 先用本表拿到候選人代碼與得票，再以候選人代碼查 candidates 取 metadata
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/records?候選人代碼={候選人代碼}"
```

### 範例 5：查某縣市所有鄉鎮的得票分布（跨資料集工作流）

`行政區代碼` 是 exact match 篩選，**無法用前綴直接過濾「某縣市的全部鄉鎮」**。標準做法分兩步：

**步驟一**：先向 `tw.openfun~entity~geo` 取得該縣市所有鄉鎮代碼（8 碼）：

```bash
# 新北市（65000）所有鄉鎮，共 29 筆
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?level=town&county_id=65000&per_page=50"
```

**步驟二**：用選舉代碼 + 鄉鎮層取得全台灣所有鄉鎮的票數，再 client-side 篩出步驟一取回的代碼：

```bash
# 2024 總統大選，所有鄉鎮層得票（368鄉鎮 × 候選人數，約 1,100 筆，數頁可取完）
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~txn~candidates-votes/records?選舉代碼=ELC-P0-16&行政區層級=town&per_page=200"
```

取回後以 `行政區代碼` 比對步驟一的代碼清單，篩出新北市 29 個鄉鎮的票數。

> 端到端完整示範（含 GIS 地圖繪製）見 [選舉地圖：鄉鎮藍綠地圖製作指引](../../topics/election-map-recipe/knowledge.md)。

---

## 注意事項與限制

1. **務必加篩選**：逾 300 萬筆，無條件查詢會逾時或回傳過量。至少帶 `候選人代碼` 或 `選舉代碼`+`行政區層級`。
2. **層級不可相加**：總計取 `national`，分布取單一層級。
3. **只有得票數**：選舉人數／投票率／廢票在 [`tw.gov.cec~txn~votes-geo`](../tw.gov.cec~txn~votes-geo/skill.md)。
4. **metadata 要 JOIN**：姓名、政黨等以 `候選人代碼` 串 [`tw.gov.cec~ref~candidates`](../tw.gov.cec~ref~candidates/skill.md)。
5. **少數歷史村里缺村里層**：部分歷年改名／裁併／罕用字的村里地名對不上現行行政區代碼，村里層可能缺漏，彙總層不受影響。
6. **不分區立委候選人不在本表**：屬政黨名單分配制、不獨立計票（其 `候選人代碼` 為 `ELC-L0-{屆}:party-{政黨代碼}:{順位}`，但 candidates-votes 查不到）；要查不分區候選人名單請去 [`tw.gov.cec~ref~candidates`](../tw.gov.cec~ref~candidates/skill.md)。**原住民立委候選人有獨立計票、在本表**（`候選人代碼` 中段為 `平地原住民` / `山地原住民`）。
7. **村里層即投開票所層**：村里層每列是一個投開票所（`行政區代碼` 空、鍵為 `投開票所識別碼`），跨村里共用的投開票所只有一列整體得票、不拆分到各村里，故取不到「合併所」內各村里個別得票；要對應村里以 `投開票所識別碼` 串 [`tw.gov.cec~ref~polling-station`](../tw.gov.cec~ref~polling-station/skill.md)（其 `村里代碼` 可多村里）。各列互斥，**村里層加總不需去重**。

---

## 關聯資料集

| 資料集 | 說明 | 用途 |
|--------|------|------|
| [`tw.gov.cec~ref~candidates`](../tw.gov.cec~ref~candidates/skill.md) | 候選人 metadata | `候選人代碼` 引用 |
| [`tw.gov.cec~ref~election-event`](../tw.gov.cec~ref~election-event/skill.md) | 投票事件 | `選舉代碼` 引用 |
| [`tw.openfun~entity~geo`](../tw.openfun~entity~geo/skill.md) | 行政區代碼 + GIS 邊界 | `行政區代碼` 引用；GIS API 可取得各行政區 polygon 用於地圖繪製 |
| [`tw.gov.cec~txn~votes-geo`](../tw.gov.cec~txn~votes-geo/skill.md) | 投票概況 | 同行政區的選舉人數／廢票 |
| [`tw.gov.cec~txn~party-votes`](../tw.gov.cec~txn~party-votes/skill.md) | 不分區政黨得票 | 政黨層級得票 |
| [選舉地圖：鄉鎮藍綠地圖製作指引](../../topics/election-map-recipe/knowledge.md) | 跨資料集整合示範 | 候選人 + 得票數 + GIS 邊界 → Leaflet choropleth 地圖的完整流程 |

---

## 快速參考

| 項目 | 說明 |
|------|------|
| Records URL | `https://data.openfun.tw/api/v1/datasets/tw.gov.cec~txn~candidates-votes/records` |
| 認證 | `Authorization: Bearer {token}` 必填 |
| 總筆數 | 見 Portal 資料集頁面（數百萬筆，隨新選舉增加） |
| 主鍵 | `識別碼`（`{候選人代碼}:{行政區代碼}`） |
| 篩選器欄位 | `候選人代碼`、`選舉代碼`、`行政區層級`、`行政區代碼`、`選區.代碼` |
| 層級 | `village` / `town` / `county` / `national`（不可相加，總計取 national） |
| 更新頻率 | 不定期，每有新選舉資料釋出時新增 |
| 來源 | 中選會選舉資料庫（db.cec.gov.tw） |
| 用途 | 候選人各層級得票；可與候選人、選舉、行政區、投票概況做 JOIN |