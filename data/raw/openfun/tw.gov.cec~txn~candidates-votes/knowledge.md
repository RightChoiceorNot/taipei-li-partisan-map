---
reviewed_by:
  rd: yo
  pm: Zoe
---
# `tw.gov.cec~txn~candidates-votes` — 中選會候選人得票數

版本：2026-06　最後更新：2026-06-05　維護：歐噴資料（data.openfun.tw）　授權：CC-BY 4.0 International　原始資料授權：政府資料開放授權條款－第 1 版

## 資料集概述

中央選舉委員會所公開之**候選人在各行政區層級的得票數**。每筆紀錄是「某位候選人 × 某個行政區（或全國／縣市／鄉鎮／村里彙總）」的得票數。這是選舉結果資料的核心，可回答「誰得了多少票」。

本資料集為交易型（txn）資料，可串接：
- [`tw.gov.cec~ref~candidates`](../tw.gov.cec~ref~candidates/knowledge.md)（候選人 metadata，`候選人代碼` 引用）
- [`tw.gov.cec~ref~election-event`](../tw.gov.cec~ref~election-event/knowledge.md)（哪場選舉，`選舉代碼` 引用）
- [`tw.openfun~entity~geo`](../tw.openfun~entity~geo/knowledge.md)（行政區，`行政區代碼` 引用）
- [`tw.gov.cec~txn~votes-geo`](../tw.gov.cec~txn~votes-geo/knowledge.md)（同行政區的投票概況：選舉人數、廢票等）

## 資料來源

| 項目 | 說明 |
|------|------|
| 原始資料 | 中央選舉委員會選舉資料庫 https://db.cec.gov.tw |
| 整理來源 | 歐噴資料庫（data.openfun.tw） |
| 原始授權 | 政府資料開放授權條款－第 1 版 |
| 引用標示 | 資料來源：歐噴資料庫（data.openfun.tw）／中央選舉委員會 |
| 總筆數 | 見 Portal 資料集頁面（隨新選舉持續增加）|
| 涵蓋範圍 | 中選會選舉資料庫所載歷屆各級選舉的候選人得票 [來源: of-scripts-選舉資料庫-knowledge.md]；場次隨新選舉增加，目前涵蓋以 `agg?group_by=選舉代碼` 或 [`tw.gov.cec~ref~election-event`](../tw.gov.cec~ref~election-event/knowledge.md) 為準 |
| 更新頻率 | 不定期，每有新選舉資料釋出時新增 |

## 行政區層級（`行政區層級`）

得票數依行政區層級分層儲存，同一候選人在多個層級都有紀錄，由細到粗為 [來源: api-agg-by-level.json]：

| `行政區層級` | 說明 |
|-------------|------|
| `village` | 村里層（最細，筆數最多）|
| `town` | 鄉鎮市區層 |
| `county` | 縣市層 |
| `national` | 全國層（單一候選人的得票總計）|

⚠️ **這些層級是同一筆得票的不同彙總粒度，不可相加**。要某候選人的總得票，取其 `行政區層級=national` 那筆即可，不要把 village 全部加總（會重複）。`national` 層的 `行政區代碼` 為空字串 [來源: api-schema-and-sample.json]。

## 欄位說明

### `識別碼`

主鍵（`_id`），格式 `{候選人代碼}:{第三段}`。第三段在 `village` 層為 `投開票所識別碼`（如 `ELC-L0-4:09007:1:ELC-L0-4:09007:0003`），其餘層級為 `行政區代碼`；national 層因行政區代碼為空，識別碼結尾為 `:`（如 `ELC-L0-11:09020-1:1:`）。

### `候選人代碼`

對應 [`tw.gov.cec~ref~candidates`](../tw.gov.cec~ref~candidates/knowledge.md) 的主鍵，格式 `{選舉代碼}:{選區代碼}:{號次}`。為篩選器欄位，是查特定候選人得票的主要入口。

### `選舉代碼`

對應 [`tw.gov.cec~ref~election-event`](../tw.gov.cec~ref~election-event/knowledge.md) 的 `vote_id`。為篩選器欄位。

### `行政區代碼`

對應 [`tw.openfun~entity~geo`](../tw.openfun~entity~geo/knowledge.md)。鄉鎮為 8 碼、縣市為 5 碼，全國層為空字串。**`village` 層：當該列帶有 `投開票所識別碼` 時 `行政區代碼` 留空**，地理歸屬改由 `投開票所識別碼` 串接取得；`行政區代碼` 只是「沒有 `投開票所識別碼` 時」的 fallback（少數無票所資訊的村里列才會在此填入 `{8碼鄉鎮}-{3碼村里}`，如 `10007210-010`）。為篩選器欄位。

### `行政區層級`

`village` / `town` / `county` / `national`，見上節。為篩選器欄位。

### `投開票所識別碼`

該村里層得票對應的投開票所，對應 [`tw.gov.cec~ref~polling-station`](../tw.gov.cec~ref~polling-station/knowledge.md) 的 `識別碼`，格式 `{選舉代碼}:{縣市代碼}:{投開票所代號}`（如 `ELC-P0-10:10001:0369`）。**僅 `village` 層有值**，town／county／national 層為空。近年選舉的村里層得票實為「以投開票所為單位」：每列即一個投開票所、`行政區代碼` 留空，須以本欄串 `polling-station` 才能得知其涵蓋的村里（一所可涵蓋多村里）。為篩選器欄位。

### `選區` 與 `選區.代碼`

- `選區`：選區名稱（文字），national 層為 `全國`
- `選區.代碼`：選區代碼（篩選器）

⚠️ **`選區.代碼` 對原住民立委候選人為空字串**：平地原住民／山地原住民立委候選人的選區是「全國的原住民選票」（同票同制不分區域），本資料庫對應之 `選區.代碼` 留空，原始的「平地原住民」「山地原住民」字串只在 `候選人代碼` 中間段（如 `ELC-L0-11:平地原住民:1`）出現 [來源: api-schema-and-sample.json]。要查原住民立委候選人不要用 `選區.代碼` 篩，改用 `候選人代碼` 篩。

### `得票數`

該候選人在該行政區（或彙總層）的得票數（整數）[來源: api-schema-and-sample.json]。

### 村里層＝投開票所層（投開票所合併的處理）

實務上多個人口不足的村里會**共用同一投開票所**（如馬祖、屏東市部分里）時，中選會的原始資料顯示的就是合併後的票數。本資料集 `得票數` 為候選人在該所的整體得票（未拆分），`投開票所識別碼` 為其鍵、`行政區代碼` 留空，`選區` 會以頓號列出涵蓋村里（如「連江縣南竿鄉仁愛村、馬祖村、津沙村、珠螺村、清水村、四維村」）。要取得該所涵蓋的村里代碼，以 `投開票所識別碼` 串 [`tw.gov.cec~ref~polling-station`](../tw.gov.cec~ref~polling-station/knowledge.md) 的 `村里代碼`（多值）。

> 因此**無法取得「合併投開票所」內各村里的個別得票**——最細真實粒度是投開票所，不是村里。


## 資料特性與限制

### 常見誤用與注意事項

1. **層級不可相加**：village/town/county/national 是同一票的不同粒度彙總，要總計取 `national`，勿加總細層。
2. **這裡只有「得票數」**：選舉人數、投票數、有效票、廢票等投票概況在 [`tw.gov.cec~txn~votes-geo`](../tw.gov.cec~txn~votes-geo/knowledge.md)；本資料集不含。
3. **候選人 metadata 要 JOIN**：姓名、政黨、性別等不在本表，需以 `候選人代碼` 串 [`tw.gov.cec~ref~candidates`](../tw.gov.cec~ref~candidates/knowledge.md)。
4. **不分區政黨得票不在此**：政黨票得票請查 [`tw.gov.cec~txn~party-votes`](../tw.gov.cec~txn~party-votes/knowledge.md)。**不分區立委候選人不會出現在本表**（其當選由政黨依得票比率與名單順位分配，不獨立計票）；要查不分區候選人名單請去 [`tw.gov.cec~ref~candidates`](../tw.gov.cec~ref~candidates/knowledge.md)（候選人代碼形如 `ELC-L0-{屆}:party-{政黨代碼}:{順位}`）。**原住民立委候選人則有獨立得票、會出現在本表**（候選人代碼如 `ELC-L0-{屆}:平地原住民:{號次}` 或 `:山地原住民:{號次}`）。
5. **少數歷史村里缺村里層**：部分歷年改名／裁併／罕用字的村里地名無法對應現行行政區代碼，村里層可能缺漏；縣市／鄉鎮／全國彙總不受影響 [來源: of-scripts-選舉資料庫-knowledge.md]。
6. **補選得票來自另一來源**：立委補選候選人得票取自中選會罷免補選公告，補選選區常為「數個村里」範圍，這些村里的村里層可能缺漏 [來源: of-scripts-選舉資料庫-knowledge.md]。

## 相關資料集

| 資料集 | 關聯說明 |
|--------|---------|
| [`tw.gov.cec~ref~candidates`](../tw.gov.cec~ref~candidates/knowledge.md) | 候選人 metadata，`候選人代碼` 引用 |
| [`tw.gov.cec~ref~election-event`](../tw.gov.cec~ref~election-event/knowledge.md) | 投票事件，`選舉代碼` 引用其 `vote_id` |
| [`tw.openfun~entity~geo`](../tw.openfun~entity~geo/knowledge.md) | 行政區代碼，`行政區代碼` 引用；GIS API 可取得各行政區地理邊界 |
| [`tw.gov.cec~txn~votes-geo`](../tw.gov.cec~txn~votes-geo/knowledge.md) | 同行政區的投票概況（選舉人數、廢票等） |
| [`tw.gov.cec~txn~party-votes`](../tw.gov.cec~txn~party-votes/knowledge.md) | 不分區政黨得票（政黨層級） |
| [選舉地圖：鄉鎮藍綠地圖製作指引](../../topics/election-map-recipe/knowledge.md) | 以 2024 總統大選新北市為例，示範整合得票資料與 GIS 邊界繪製 choropleth 地圖的完整流程 |

## 更新頻率與版本記錄

| 版本 | 更新日期 | 說明 |
|------|----------|------|
| 2026-05 | 2026-05-29 | 知識文件初始建立；schema、層級分布、層級不可相加規則經 API 實查驗證 |
| 2026-06 | 2026-06-05 | 新增 `合併票數` / `合併票數.村里` 欄位說明（跨村里投開票所平均拆分），補同群得票未必相等之注意事項 |
| 2026-06 | 2026-06-06 | 資料改版：移除 `合併票數` / `合併票數.村里`，改為村里層即投開票所層（新增 `投開票所識別碼`、`行政區代碼` 於村里層留空為 fallback），同步改寫合併處理與加總說明 |

## AI 使用指引

AI agent 使用指引見 [skill.md](skill.md)。
