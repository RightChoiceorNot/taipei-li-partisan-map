---
reviewed_by:
  rd: yo
  pm: Zoe
---
# 各級選舉投開票所 — `tw.gov.cec~ref~polling-station`

> **給 AI 閱讀的使用指引。**
> 人類可在 https://data.openfun.tw/datasets/tw.gov.cec~ref~polling-station 看到同份內容的網頁版。
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

資料集 slug：tw.gov.cec~ref~polling-station
API 端點：https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~polling-station/records
認證方式（必填）：HTTP Header Authorization: Bearer {token}

最簡查詢範例：curl -H "Authorization: Bearer YOUR_TOKEN" "https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~polling-station/records?per_page=20"

**Token 是必要條件，沒有 Token 就無法查資料。**
如果使用者沒有 Token，請停止並告訴使用者：「請先前往 https://data.openfun.tw/user 免費申請帳號與 API Token，取得後告訴我，我再幫您查詢。若使用 Claude Code，可透過 Device Authorization Grant 流程取得短效 Token，詳見 https://data.openfun.tw/knowledge/api-docs」

禁止抓取 HTML 頁面（本平台有 bot 保護，WebFetch 讀 HTML 頁面會失敗）。

授權標注：使用此資料產出的內容需標注「資料來源：歐噴資料庫（data.openfun.tw）／中央選舉委員會」

---

## 這份資料集能回答什麼問題

以下問題，這份資料集**可以回答**：

- 「某投開票所（識別碼）屬於哪個縣市／鄉鎮／村里？」
- 「某次選舉某縣市有哪些投開票所？」
- 「某村里代碼涵蓋哪些投開票所？」（搭配 `村里代碼` 篩選）
- 「某次選舉全國／某縣市的投開票所數量？」（用 /agg）

以下問題，這份資料集**無法回答**：

- 「投開票所的名稱或地址是什麼？」（本資料集只有代碼，無名稱／地址）
- 「某投開票所的得票數？」（應查 `tw.gov.cec~txn~votes-geo`，以 `投開票所識別碼` 串接）
- 「縣市／村里代碼對應的中文地名？」（應查 `tw.openfun~entity~geo`）

---

## 欄位說明

> API 查詢時使用「欄位名稱」作為 query 參數名稱。全 6 欄皆為代碼（keyword）。

| 欄位名稱 | 型別 | 說明 |
|---------|------|------|
| `識別碼` | keyword（_id） | `{選舉代碼}:{縣市代碼}:{投開票所代號}`，如 `ELC-P0-15:10009:0350` |
| `選舉代碼` | keyword | 對應 `tw.gov.cec~ref~election-event`，如 `ELC-P0-15` |
| `縣市代碼` | keyword | 5 碼，對應 `tw.openfun~entity~geo`，如 `10009` |
| `投開票所代號` | keyword | 縣市內部編號，4 碼零補，如 `0350` |
| `鄉鎮代碼` | keyword | 8 碼，對應 `tw.openfun~entity~geo`，如 `10009110` |
| `村里代碼` | keyword（多值陣列） | 村里代碼，對應 `tw.openfun~entity~geo`，如 `["10009110-018"]`。可多值（外島／小區常見，如連江縣一所涵蓋 6 村里） |

---

## API 呼叫範例

**Records URL：** `https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~polling-station/records`

### 範例 1：用識別碼查單一投開票所的地理歸屬

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~polling-station/records?識別碼=ELC-P0-15:10009:0350"
```

用途：取得該票所的縣市／鄉鎮／村里代碼，再用 `tw.openfun~entity~geo` 翻成地名。

### 範例 2：列出某次選舉某縣市的所有投開票所

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~polling-station/records?選舉代碼=ELC-P0-15&縣市代碼=10009&per_page=100"
```

### 範例 3：查某村里涵蓋哪些投開票所

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~polling-station/records?村里代碼=10009110-018"
```

---

## 統計聚合（/agg 端點）

**Agg URL：** `https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~polling-station/agg`

```bash
# 各選舉代碼的投開票所數量
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~polling-station/agg?group_by=選舉代碼"

# 某次選舉各縣市的投開票所數量
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~polling-station/agg?group_by=縣市代碼&選舉代碼=ELC-P0-15"
```

回應格式：`groups[].key` 為分組值、`groups[].stats.count` 為筆數。

---

## 關聯資料集

| 資料集 | 說明 | 用途 |
|--------|------|------|
| [`tw.gov.cec~ref~election-event`](../tw.gov.cec~ref~election-event/skill.md) | 選舉事件清單 | 以 `選舉代碼` 對照選舉名稱／日期 |
| [`tw.gov.cec~txn~votes-geo`](../tw.gov.cec~txn~votes-geo/skill.md) | 投開票所得票地理彙整 | 以 `投開票所識別碼` ＝本資料集 `識別碼` 串接得票 |
| [`tw.gov.cec~txn~candidates-votes`](../tw.gov.cec~txn~candidates-votes/skill.md) | 候選人得票 | 含 `投開票所識別碼` 欄 |
| [`tw.openfun~entity~geo`](../tw.openfun~entity~geo/skill.md) | 行政區代碼對照 | 把縣市／鄉鎮／村里代碼翻成中文地名 |

---

## 注意事項與限制

1. **無投開票所名稱／地址**：本資料集只有代碼，回答「票所屬於哪個行政區」而非「票所叫什麼、在哪」。
2. **`識別碼` 含選舉代碼**：同一實體票所跨選舉是不同 `識別碼`，跨選舉比對需用 `縣市代碼`＋`投開票所代號`。
3. **`村里代碼` 是陣列**：一個票所可涵蓋多個村里（外島／小區常見，實測連江縣 334 筆中 228 筆為多村里），程式須以陣列處理。
4. 縣市／鄉鎮／村里代碼的中文名稱需另查 `tw.openfun~entity~geo`。

---

## 快速參考

| 項目 | 說明 |
|------|------|
| Records URL | `https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~polling-station/records` |
| Agg URL | `https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~polling-station/agg` |
| 認證 | `Authorization: Bearer {token}` 必填 |
| 取得 Token | 免費申請：https://data.openfun.tw/user |
| 精確篩選 | `?選舉代碼=ELC-P0-15`、`?縣市代碼=10009`、`?村里代碼=10009110-018` |
| 分頁 | `?page=1&per_page=20` |
| 總筆數 | 見 Portal 資料集頁面（隨新選舉增加） |