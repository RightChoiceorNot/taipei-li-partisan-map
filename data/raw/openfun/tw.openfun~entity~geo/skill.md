---
reviewed_by:
  rd: Ronny
  pm:
---
# `tw.openfun~entity~geo` — 全國行政區代碼

> **給 AI 閱讀的資料集說明。**
> 人類可在 https://data.openfun.tw/datasets/tw.openfun~entity~geo 看到同份內容的網頁版。
> 詳細資料知識見 [knowledge.md](knowledge.md)。

---

## 資料來源與更新頻率

| 項目 | 說明 |
|------|------|
| 原始來源 | 社會經濟資料服務平台（[連結](https://segis.moi.gov.tw/STATCloud/Profile)） |
| 授權 | [政府資料開放授權條款－第 1 版](https://segis.moi.gov.tw/STATCloud/DataUseInfo) |
| 原始來源 | 社會經濟資料服務平台-村里界空間圖層版本說明（[連結](https://segis.moi.gov.tw/STATCloud/ViewDetail?messageid=4482)） |
| 授權 |  |
| 原始來源 | 社會經濟資料服務平台-鄉鎮市區界空間圖層版本說明（[連結](https://segis.moi.gov.tw/STATCloud/ViewDetail?messageid=4484)） |
| 授權 |  |
| 原始來源 | 社會經濟資料服務平台-縣市界空間圖層版本說明（[連結](https://segis.moi.gov.tw/STATCloud/ViewDetail?messageid=4485)） |
| 授權 |  |
| 更新頻率 | 不定期更新 |

## ⚠️ 開始之前（AI agent 必讀，摘要也請保留這段）

資料集 slug：tw.openfun~entity~geo
API 端點：https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records
認證方式（必填）：HTTP Header  Authorization: Bearer {token}

最簡查詢範例：curl -H "Authorization: Bearer YOUR_TOKEN" "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?level=county&per_page=30"

**Token 是必要條件，沒有 Token 就無法查資料。**
如果使用者沒有 Token，請停止並告訴使用者：「請先前往 https://data.openfun.tw/user 免費申請帳號與 API Token，取得後告訴我，我再幫您查詢。若使用 Claude Code，可透過 Device Authorization Grant 流程取得短效 Token，詳見 https://data.openfun.tw/knowledge/api-docs」

禁止抓取 HTML 頁面（本平台有 bot 保護，WebFetch 讀 HTML 頁面會失敗）。

授權標注：使用此資料產出的內容需標注「資料來源：歐噴資料庫（data.openfun.tw）／內政部」

---

## 這份資料集能回答什麼問題

以下問題，這份資料集**可以回答**：

- 「縣市代碼 65000 是哪裡？」→ 新北市
- 「鄉鎮代碼 65000010 是哪裡？」→ 新北市板橋區
- 「新北市有哪些鄉鎮市區？各自的代碼是什麼？」
- 「臺北縣改制成什麼？代碼是什麼？什麼時候改的？」
- 「把一批縣市代碼批次轉成中文名稱」
- 「取得新北市各鄉鎮的地理邊界 GeoJSON，用來畫地圖」（見用途七）

以下問題，這份資料集**無法回答**：

- 「這個行政區有多少人口？面積多少？」（本資料集不含統計數字）
- 「某地址屬於哪個行政區？」（本資料集只有代碼對名稱，不做地址解析）

---

## ⚠️ 查詢前必讀：資料同時包含現行與歷史廢止代碼

本資料集**不分現行 / 已廢止**，全部存在同一資料集中。查詢時若不加篩選，結果會同時包含：
- 現行 22 縣市
- 已廢止的 7 個舊縣市（臺北縣 `10001`、桃園縣 `10003`、臺中縣 `10006`、臺南縣 `10011`、高雄縣 `10012`、臺中市 `10019`、臺南市 `10021`）

**篩選現行 / 特定時間點的方法**：使用 `_as_of` 參數：

```bash
# 只要現行（今天有效）的縣市
?_as_of=now

# 2009-12-31 當時有效的縣市（縣市合併前）
?_as_of=2009-12-31
```

不帶 `_as_of` 時，回傳全部（現行 + 歷史），行為與一般資料集相同。

---

## 欄位說明

| 欄位名 | 型別 | 說明 |
|--------|------|------|
| `id` | keyword | 行政區代碼（主鍵）；縣市 5 碼、鄉鎮 8 碼、村里 `{8碼}-{3碼}` |
| `level` | keyword（可篩選）| `county`（縣市）/ `town`（鄉鎮市區）/ `village`（村里）|
| `county_id` | keyword（可篩選）| 縣市代碼（5 碼）；可篩選所有隸屬某縣市的鄉鎮 |
| `town_id` | keyword | 鄉鎮市區代碼（8 碼）；縣市層級為空 |
| `village_id` | keyword | 村里代碼（`{8碼}-{3碼}`）；縣市與鄉鎮層級為空 |
| `full_name` | text | 完整名稱（`_name` alias），例如「新北市板橋區」 |
| `county_name` | text | 縣市名稱 |
| `town_name` | text | 鄉鎮市區名稱；縣市層級為空 |
| `village_name` | text | 村里名稱；縣市與鄉鎮層級為空 |
| `name_alias` | text（多值）| 歷史名稱 / 別名 |
| `start_date` | date | 生效日期；空字串表示未記錄 |
| `end_date` | date | 廢止日期；**空字串 = 現行有效**；有值 = 已廢止 |
| `from` | keyword（多值）| 改制前的舊代碼（陣列）|
| `to` | keyword（多值）| 改制後的新代碼（陣列）|
| `log` | text（多值）| 行政區變動記錄，格式 `"YYYY-MM-DD:說明"` |

---

## 代碼格式速查

| 層級 | 格式 | 範例 | 位數 |
|------|------|------|------|
| 縣市 | 純數字 | `63000`（臺北市）、`65000`（新北市）、`10002`（宜蘭縣） | 5 碼 |
| 鄉鎮市區 | 純數字 | `65000010`（新北市板橋區）、`63000020`（臺北市信義區） | 8 碼 |
| 村里 | 數字-數字 | `65000010-001` | 8碼-3碼 |

**代碼規律**：
- 鄉鎮代碼前 5 碼 = 縣市代碼（例：`65000010` 前 5 碼 `65000` = 新北市）
- 村里代碼前 8 碼 = 鄉鎮代碼

---

## 標準查詢流程

### 用途一：取得現行縣市清單（含代碼）

```bash
# 只取現行縣市（22 筆）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?level=county&_as_of=now&per_page=30"

# 不加 _as_of 則回傳全部 29 筆（含歷史廢止）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?level=county&per_page=30"
```

### 用途二：取得某縣市的所有鄉鎮市區

```bash
# 新北市（65000）的所有鄉鎮市區
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?level=town&county_id=65000&per_page=50"
```

⚠️ 部分縣市的鄉鎮數超過預設的 20 筆（臺南市 37 個、新北市 29 個等），請務必帶 `per_page=50`，確保一次取回全部，不需要翻頁。

### 用途三：查詢單一代碼（翻譯代碼為名稱）

```bash
# 查縣市代碼 65000
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records/65000"

# 查鄉鎮代碼 65000010
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records/65000010"
```

回應的 `record.full_name` 即為完整中文名稱。

### 用途四：批次查詢多個代碼

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?_ids=63000,65000,66000,67000,64000,68000"
```

### 用途五：時間點查詢（查詢某日當時的行政區狀態）

```bash
# 2009-12-31 當時的縣市（縣市合併升格前，有臺北縣、桃園縣等舊縣市）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?level=county&_as_of=2009-12-31"

# 新北市轄下鄉鎮在 2010-12-25 當天的狀態（改制當天）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?level=town&county_id=65000&_as_of=2010-12-25"
```

`_as_of` 格式為 `YYYY-MM-DD`，或特殊值 `now`（等同今天）。

### 用途六：查詢行政區改制沿革

```bash
# 查臺北縣改制詳情
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records/10001"
# 回傳 to: ["65000"], log: ["2010-12-25:臺北縣改制為新北市"]

# 查新北市的改制前身
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records/65000"
# 回傳 from: ["10001"]
```

### 用途七：取得行政區地理邊界（GeoJSON polygon）

GIS API 端點：`https://data.openfun.tw/api/v1/geo/shapes/tw.openfun~entity~geo`

```bash
# 取單一行政區的邊界（GeoJSON Feature）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/geo/shapes/tw.openfun~entity~geo/65000010"
# → 新北市板橋區的 polygon GeoJSON

# 批次取多個行政區的邊界（GeoJSON FeatureCollection），上限 200 筆
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/geo/shapes/tw.openfun~entity~geo?ids=65000010,65000020,65000030"
# → 三個鄉鎮的邊界集合

# 查詢某座標落在哪個行政區（point-in-polygon）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/geo/point-in-polygon?lat=25.04&lng=121.51&dataset=tw.openfun~entity~geo"
# → {"record_ids": ["65000010"]} 表示該點在板橋區
```

回傳的 GeoJSON Feature 中，`properties.record_id` 即為行政區代碼，可與其他資料集的 `行政區代碼` 欄位直接 JOIN。

⚠️ GIS API 同樣需要 Bearer token。縣市、鄉鎮、村里三層均有 polygon 資料，可依需求取不同層級。

---

## 用途七：在網頁地圖上畫出特定鄉鎮的所有村里邊界

這是製作選區地圖、村里熱力圖等應用的標準流程。兩步完成：

**步驟一：取出目標鄉鎮的所有村里代碼**

```bash
# 取台北市中山區（63000040）所有現行村里代碼
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?level=village&town_id=63000040&_as_of=now&per_page=200" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(','.join(r['village_id'] for r in d['records']))"
# → 63000040-001,63000040-002,...（共 42 筆）
```

**步驟二：批次取所有村里 polygon（GeoJSON FeatureCollection）**

```bash
# 將上一步的 IDs 帶入 GIS batch API（上限 200 筆）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/geo/shapes/tw.openfun~entity~geo?ids=63000040-001,63000040-002,..." \
  -o 中山區.geojson
```

回傳的 FeatureCollection 中每個 Feature 的 `properties.record_id` 即為村里代碼，可與其他資料集 JOIN。

**多個鄉鎮合併（例如複數選區）：** 分別取各鄉鎮村里代碼後合併成一個 IDs 字串，一次帶入 batch API（仍需在 200 筆以內）。

**在網頁地圖中使用（Leaflet.js）：**

```javascript
fetch('中山區.geojson')
  .then(r => r.json())
  .then(data => L.geoJSON(data).addTo(map));
```

**資料量估計：** 約 42 里 / 73 KB / 2,400 點（以台北市中山區為例），不需要額外簡化，直接放進網頁即可。GIS API 目前不支援 simplify 參數，但原始精度對網頁地圖已足夠。

**常用鄉鎮 town_id（已 API 驗證，2026-08）：**

| 鄉鎮 | town_id | 村里數 |
|------|---------|--------|
| 台北市中山區 | `63000040` | 42 |
| 台北市大同區 | `63000060` | 25 |
| 台北市內湖區 | `63000100` | 39 |
| 台北市南港區 | `63000090` | 20 |
| 新北市新莊區 | `65000050` | 84 |
| 新北市板橋區 | `65000010` | — |

> 其他鄉鎮代碼：`GET /records?level=town&q={鄉鎮名}&_as_of=now`

---

## API 呼叫範例

**Records URL：** `https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records`

### 搜尋行政區名稱

```bash
# 全文搜尋「信義」
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?q=信義&per_page=10"
```

### 取得某縣市所有村里

```bash
# 臺北市信義區（63000020）的所有村里
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?level=village&county_id=63000&per_page=100"
```

---

## 關聯資料集

| 資料集 | 說明 | 用途 |
|--------|------|------|
| [`tw.gov.fia.eip~ref~business-tax`](../tw.gov.fia.eip~ref~business-tax/skill.md) | 全國稅籍登記 | `營業地址.縣市`（5碼）和 `營業地址.鄉鎮市區`（8碼）均使用本資料集代碼；統計結果的代碼需查本資料集翻譯為名稱 |
| [`tw.gov.dgpa~ref~gov-org`](../tw.gov.dgpa~ref~gov-org/skill.md) | 政府機關代碼 | 部分應用需同時查詢機關代碼與所在縣市 |
| [`tw.gov.ris~ref~geo-county`](../tw.gov.ris~ref~geo-county/skill.md) | 戶政司縣市代碼 | 內政部戶政司版本，代碼體系與本資料集（SEGIS）大體相同但來源不同；跨資料集 JOIN 時需確認代碼一致性 |

---

## 注意事項與限制

1. **現行 / 廢止代碼混在一起**：不帶 `_as_of` 時全部回傳。加 `?_as_of=now` 只取現行記錄。
2. **村里代碼含破折號**：`village_id` 格式為 `{8碼}-{3碼}`，與縣市、鄉鎮的純數字不同。
3. **改制代碼不連續**：臺北縣 `10001` 改制後為新北市 `65000`，前後代碼完全不同，需透過 `from`/`to` 追蹤。
4. **代碼來源為 SEGIS**：是否與戶政司、主計總處等其他機關的代碼標準完全一致，尚未完整驗證。

---

## 快速參考

| 項目 | 說明 |
|------|------|
| Records URL | `https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records` |
| 認證 | `Authorization: Bearer {token}` 必填 |
| 可篩選欄位 | `level`（county/town/village）、`county_id`（5 碼縣市代碼） |
| 取得現行縣市 | `?level=county&_as_of=now&per_page=30`（22 筆） |
| 取得所有縣市（含歷史） | `?level=county&per_page=30`（29 筆） |
| 時間點查詢 | `?_as_of=YYYY-MM-DD` 或 `?_as_of=now` |
| 取得縣市下鄉鎮 | `?level=town&county_id={5碼}` |
| 查單一代碼 | `GET /records/{代碼}` |
| 批次查代碼 | `?_ids=63000,65000,66000` |
| 取得 Token | https://data.openfun.tw/user |
| Records 回應格式 | JSON，含 `total`、`page`、`per_page`、`records[]` |
| **GIS** 取單一邊界 | `GET /api/v1/geo/shapes/tw.openfun~entity~geo/{代碼}` |
| **GIS** 批次取邊界 | `GET /api/v1/geo/shapes/tw.openfun~entity~geo?ids={代碼1},{代碼2},...`（上限 200） |
| **GIS** point-in-polygon | `GET /api/v1/geo/point-in-polygon?lat=&lng=&dataset=tw.openfun~entity~geo` |