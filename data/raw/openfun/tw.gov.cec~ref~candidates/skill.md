---
reviewed_by:
  rd: Ronny
  pm: Zoe
---
# `tw.gov.cec~ref~candidates` — 中選會候選人資料

> **給 AI 閱讀的資料集說明。**
> 人類可在 https://data.openfun.tw/datasets/tw.gov.cec~ref~candidates 看到同份內容的網頁版。
> 詳細資料知識見 [knowledge.md](knowledge.md)。

---

## 資料來源與更新頻率

| 項目 | 說明 |
|------|------|
| 原始來源 | 政府資料開放平台 - 選舉資料庫(含選舉區資料)（[連結](https://data.gov.tw/dataset/13119)） |
| 授權 | [政府資料開放授權條款－第 1 版](https://data.gov.tw/dataset/13119) |
| 原始來源 | 中央選舉委員會 - 罷免、補選及重行選舉資訊（[連結](https://www.cec.gov.tw/central/menu/132)） |
| 授權 | [政府資料開放授權條款－第 1 版](https://www.cec.gov.tw/central/article/21322) |
| 更新頻率 | 每週更新 |

建議標注：CC-BY 歐噴資料庫, 中選會, 政府資料開放平台

## ⚠️ 開始之前（AI agent 必讀，摘要也請保留這段）

資料集 slug：tw.gov.cec~ref~candidates
API 端點：https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/records
認證方式（必填）：HTTP Header Authorization: Bearer {token}

最簡查詢範例：`curl -H "Authorization: Bearer YOUR_TOKEN" "https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/records?per_page=20"`

**Token 是必要條件，沒有 Token 就無法查資料。**
如果使用者沒有 Token，請先請使用者前往 https://data.openfun.tw/user 申請。

禁止抓取 HTML 頁面（本平台有 bot 保護）。

授權標注：使用此資料產出的內容需標注「資料來源：歐噴資料庫（data.openfun.tw）／中央選舉委員會」

---

## 這份資料集能回答什麼問題

以下問題，這份資料集**可以回答**：

- 「2024 年立委選舉某選區有哪些候選人？號次、政黨、性別、學歷？」
- 「某候選人歷年參選紀錄」（用 `人物代碼` 串接跨屆）
- 「某政黨在某次選舉提名了多少候選人？」
- 「歷年總統候選人清單」
- 「某縣市某次選舉的當選人是誰？」

以下問題，這份資料集**無法回答**：

- 「各候選人得票數」（本資料集不含得票，請查 [`tw.gov.cec~txn~candidates-votes`](../tw.gov.cec~txn~candidates-votes/skill.md)；投票率／廢票查 [`tw.gov.cec~txn~votes-geo`](../tw.gov.cec~txn~votes-geo/skill.md)）
- 「候選人政見內容」（不在本資料集）
- 「候選人的詳細財產／經歷／競選團隊」（請查財產申報、政治獻金等其他資料集）

---

## 欄位說明

| 欄位名稱 | 型別 | 說明 |
|---------|------|------|
| `候選人代碼` | keyword（_id） | 格式 `{vote_id}:{選區代碼}:{號次}`，例 `ELC-D2-98:10013070:2` |
| `人物代碼` | keyword（ref: tw.gov.cec~ref~candidates） | 同一人第一次參選的 `候選人代碼`，用於跨屆串接 |
| `選舉代碼` | keyword（ref: [tw.gov.cec~ref~election-event](../tw.gov.cec~ref~election-event/skill.md)） | 對應 tw.gov.cec~ref~election-event 的 `vote_id` |
| `選舉名稱` | text | 選舉名稱中文，格式為「`{民國年}年{層級}選舉`」（如 `113年立法委員選舉`、`98年鄉(鎮、市)長選舉`，注意括號）。⚠️ JOIN `tw.gov.cec~ref~election-event` 取得的 `選舉代碼.vote_name` 格式為「`第{屆次}屆{層級}選舉`」（如 `第11屆立法委員選舉`），語意相同但格式不同 |
| `姓名` | text（_name） | 候選人姓名 |
| `選區別` | text | 選區描述（中文），e.g. `屏東縣麟洛鄉` |
| `選區別.縣市` | keyword（篩選器、ref: tw.openfun~entity~geo） | 選區所在縣市代碼 |
| `選區別.鄉鎮市區` | keyword（篩選器、ref: tw.openfun~entity~geo） | 選區所在鄉鎮市區代碼 |
| `選區別.村里` | keyword（篩選器、ref: tw.openfun~entity~geo） | 選區所在村里代碼 |
| `號次` | integer | 候選人號次 |
| `政黨` | keyword（篩選器） | 政黨名稱 |
| `政黨.代碼` | keyword（ref: tw.gov.moi~ref~party） | 對應 tw.gov.moi~ref~party 的政黨編號 |
| `性別` | keyword（篩選器） | `男` / `女` |
| `出生日期` | text | 出生日期（原始字串） |
| `出生日期.日期` | date | 出生日期（標準格式） |
| `出生地` | keyword（篩選器） | 中選會分類。值包括縣市名稱（`臺灣省`、`高雄市`、`新北市` 等直轄市及縣市，新舊拼法並存如 `台北市`/`臺北市`），以及 `金馬地區`、`其他省市`（大陸出生）、`其他國家`、`香港`、`其他`。⚠️ 約 25% 紀錄為空白；`福建省`、`金門縣` 等值不存在，勿用這些名稱篩選 |
| `學歷` | keyword（篩選器） | `國小`、`國中`、`高中`、`大專`、`大學`、`碩士`、`博士`、`其他`（⚠️「大專」與「大學」並存，分別代表早期專科與四年制大學） |
| `現任` | keyword（篩選器） | `Y` 或 `N` 字串 |
| `當選註記` | keyword（篩選器） | 共 5 種值：`*` 當選／空 落選／`!` 議員選舉婦女保障名額當選（全女性）／`-` 因婦女保障被擠下落選（全男性）／`?` 同票須抽籤（例如 107年村里長選舉） |
| `副手` | text | `Y` 表此筆紀錄是副總統／副手候選人；空表正候選人。僅總統副總統選舉、其他聯名選舉有用 |

---

## 候選人代碼格式

`{vote_id}:{選區代碼}:{號次}`

**選區代碼的格式因選舉類型而異**，常見兩種：

範例（地方選舉，選區代碼為 8 碼鄉鎮代碼）：`ELC-D2-98:10013070:2`
- `ELC-D2-98` = 98 年鄉鎮市長選舉（對應 tw.gov.cec~ref~election-event 的 vote_id）
- `10013070` = 選區代碼（屏東縣麟洛鄉，使用 8 碼鄉鎮代碼）
- `2` = 號次

範例（立委選舉，選區代碼為「縣市代碼-選區編號」）：`ELC-L0-11:09020-1:1`
- `ELC-L0-11` = 第 11 屆立法委員選舉
- `09020-1` = 選區代碼（金門縣第 1 選區；立委用「5 碼縣市代碼-選區編號」格式）
- `1` = 號次

---

## 查詢範例

### 範例 1：查某選舉的所有候選人

```bash
# 第 11 屆立委選舉（vote_id=ELC-L0-11）的全部候選人
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/records?選舉代碼=ELC-L0-11&per_page=100"
```

### 範例 2：查某政黨提名情況

```bash
# 民進黨在第 11 屆立委的候選人
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/records?選舉代碼=ELC-L0-11&政黨=民主進步黨&per_page=100"
```

### 範例 3：查某縣市的候選人

```bash
# 113 年立委選舉中臺北市（63000）的候選人
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/records?選舉代碼=ELC-L0-11&選區別.縣市=63000&per_page=100"
```

### 範例 4：找特定候選人歷年參選紀錄

```bash
# Step 1: 用姓名搜尋，從任一筆紀錄讀取其 `人物代碼` 欄位值
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/records?q=宋楚瑜&per_page=20"

# Step 2: 拿到該人的「人物代碼」（會是該人第一次參選之候選人代碼）後，查歷年所有紀錄
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/records?人物代碼={上一步取得的人物代碼}&per_page=50"
```

### 範例 5：統計（依政黨/學歷/性別/出生地）

```bash
# 第 11 屆立委候選人各政黨提名數
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/agg?group_by=政黨&選舉代碼=ELC-L0-11"

# 第 11 屆立委候選人學歷分佈
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/agg?group_by=學歷&選舉代碼=ELC-L0-11"
```

### 範例 6：找當選者

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/records?選舉代碼=ELC-L0-11&當選註記=*&per_page=200"
```

### 範例 7：查特定鄉鎮市區的立委候選人

⚠️ **立委的 `選區別` 是「縣市第NN選區」（如「新北市第05選區」），不是鄉鎮市區名稱。**
`選區別.鄉鎮市區` 對立委記錄為空，無法用行政區代碼（如板橋=65000010）直接篩選立委候選人。
一個鄉鎮市區可能橫跨多個立委選區（例如板橋區橫跨新北市第05、06選區）。

**建議優先方案：改用 `tw.gov.cec~txn~candidates-votes` 按行政區代碼查**

查「特定鄉鎮的立委候選人 + 得票數」用 candidates-votes 比本表更直接：

```bash
# Step 1：若只知地名，先查代碼
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.openfun~entity~geo/records?q=板橋&level=town&per_page=10"
# → 65000010（新北市板橋區）

# Step 2：查該鄉鎮該次選舉的候選人得票（含所有在此選區得票的候選人）
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~txn~candidates-votes/records?選舉代碼=ELC-L0-11&行政區代碼=65000010&行政區層級=town&per_page=50"

# Step 3：以候選人代碼 JOIN 本表取得姓名、政黨等 metadata
```

**若必須從本表（candidates ref）查選區：**

```bash
# Step 1：取回該縣市（新北市=65000）所有立委選區清單
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/agg?group_by=選區別&選舉代碼=ELC-L0-11&選區別.縣市=65000"

# Step 2：識別含目標鄉鎮的選區（需查中選會選區地圖或已知資訊）
# 板橋區 → 新北市第05選區、新北市第06選區

# Step 3：精確篩選
curl -H "Authorization: Bearer YOUR_TOKEN" \
"https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/records?選舉代碼=ELC-L0-11&選區別=新北市第05選區&per_page=20"
```

常用直轄市縣市代碼：新北市=65000、臺北市=63000、桃園市=68000、臺中市=66000、臺南市=67000、高雄市=64000

### 範例 8：找不到對應時的處理建議

1. **姓名比對**：`姓名` 為文字欄位，建議用 `?q=姓名` 全文搜尋而非精確比對。同名問題：同名候選人多，建議搭配 `出生日期` 或 `選區別` 進一步確認。
2. **政黨名稱差異**：歷史上有政黨改名或多政黨合組（如「綠黨」與「綠黨社會民主黨聯盟」於 2016 年合組推派候選人），本資料集 `政黨` 為當時申報名稱；要做跨年代政黨比較，建議用 `政黨.代碼`（對應 tw.gov.moi~ref~party 的政黨編號）而非政黨名稱。
3. **歷年同一人**：以 `人物代碼` 為主鍵串接歷屆參選；勿用姓名比對（會誤判同名者）。
4. **選舉代碼格式**：請與 [`tw.gov.cec~ref~election-event`](../tw.gov.cec~ref~election-event/skill.md) 的 `vote_id` 對照確認。

---

## 注意事項與限制

1. **沒有得票數**：本資料集只記錄「候選人是誰」（含當選註記但無票數）。得票數請查 [`tw.gov.cec~txn~candidates-votes`](../tw.gov.cec~txn~candidates-votes/skill.md)（以 `候選人代碼` 串接）；選舉人數／投票率／廢票請查 [`tw.gov.cec~txn~votes-geo`](../tw.gov.cec~txn~votes-geo/skill.md)。
2. **`當選註記` 不只 `*` 跟空**：除常見的 `*`（當選）、空（落選）之外，還有 3 個特殊符號 — `!`（婦女保障當選）、`-`（被婦女保障擠下落選）、`?`（同票須抽籤，例如 107年村里長選舉）。要找「全部當選者」務必同時納入 `*` 跟 `!`（用 `?_ids` 或多次查詢），單用 `?當選註記=*` 會漏掉以婦女保障名額當選的女性議員。
3. **`現任` 是當時參選時的狀態**：表示候選人「在該次選舉投票日當時是否為該職位之現任者」。
4. **學歷為候選人申報**：未經查核，準確性依賴申報人。
5. **「人物代碼 = 第一次候選人代碼」**：同一個人多次參選會有多筆紀錄，但 `人物代碼` 永遠是該人第一次的 `候選人代碼`，可作為跨屆 JOIN key。
6. **⚠️ 同名鄉鎮市區極常見，必須先確認縣市**：「東區」現行就有 4 個（新竹市、嘉義市、臺中市、臺南市），其他如「中正區」、「中山區」、「信義區」也類似。
   - 使用者問「XX 區的候選人」時，**若未提供縣市，請務必追問哪個縣市**，不要自行猜測或全部回傳。
   - 確認縣市後，用衍生欄位 `?選區別.縣市={縣市代碼}&選區別.鄉鎮市區={鄉鎮代碼}` 精確篩選，避免用 `?q=東區` 模糊搜尋。
   - 跨年代分析時，2010 改制前後同一行政區可能有不同代碼（如臺中市東區舊 `10019020`、新 `66000020`），兩者都要納入。
7. **⚠️ 立委選區不是行政區代碼，`選區別.鄉鎮市區` 對立委記錄為空**：立委的 `選區別` 是「縣市第NN選區」文字（如「新北市第05選區」），非 entity~geo 格式的 8 碼行政區代碼。用行政區代碼（如板橋=65000010）篩選立委候選人**不會有結果**；應改用 `選區別.縣市` 篩縣市、再從 `選區別` 文字識別目標選區（見範例 7）。地方選舉（鄉鎮市長、村里長、縣市議員）的 `選區別.鄉鎮市區` 才有值。

---

## 關聯資料集

| 資料集 | 說明 | 用途 |
|--------|------|------|
| [`tw.gov.cec~txn~candidates-votes`](../tw.gov.cec~txn~candidates-votes/skill.md) | 候選人得票數 | 該表 `候選人代碼` 引用本表主鍵 |
| [`tw.gov.cec~txn~votes-geo`](../tw.gov.cec~txn~votes-geo/skill.md) | 選區投票概況 | 選舉人數／投票率／廢票 |
| [`tw.gov.cec~ref~election-event`](../tw.gov.cec~ref~election-event/skill.md) | 歷次投票事件 | `選舉代碼` 引用 |
| [`tw.gov.cec~ref~election-level`](../tw.gov.cec~ref~election-level/skill.md) | 選舉層級代碼 | 透過 tw.gov.cec~ref~election-event 間接關聯 |
| [`tw.gov.moi~ref~party`](../tw.gov.moi~ref~party/skill.md) | 政黨資料 | `政黨.代碼` 引用 |
| [`tw.openfun~entity~geo`](../tw.openfun~entity~geo/skill.md) | 行政區資料 | `選區別.縣市/鄉鎮市區/村里` 引用 |
| [`tw.openfun~bulk~campaign-finance`](../tw.openfun~bulk~campaign-finance/skill.md) | 政治獻金 | 候選人姓名 + 選舉名稱 可對照（注意：政治獻金檔不是用 `vote_id`） |

---

## 快速參考

| 項目 | 說明 |
|------|------|
| Records URL | `https://data.openfun.tw/api/v1/datasets/tw.gov.cec~ref~candidates/records` |
| 認證 | `Authorization: Bearer {token}` 必填 |
| 總筆數 | 見 Portal 資料集頁面 |
| 主鍵 | `候選人代碼` |
| 跨屆主鍵 | `人物代碼`（同一人第一次參選之候選人代碼） |
| 篩選器欄位 | `選舉代碼`、`人物代碼`、`政黨`、`政黨.代碼`、`性別`、`出生地`、`學歷`、`現任`、`當選註記`、`選區別.縣市/鄉鎮市區/村里` |
| 更新頻率 | 每週 |
| 來源 | 中選會選舉資料庫 ／ 政府資料開放平台 |
| 用途 | 候選人 metadata；可與選舉事件、政黨、選區做 JOIN |