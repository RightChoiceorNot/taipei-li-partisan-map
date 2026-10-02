# 資料來源登錄

本專案只使用 [歐噴資料庫（OpenFun）](https://data.openfun.tw) 提供的資料。查詢日期為 2026-10-02（Asia/Taipei）。選舉資料授權標注為「資料來源：歐噴資料庫（data.openfun.tw）／中央選舉委員會」；行政區資料標注為「資料來源：歐噴資料庫（data.openfun.tw）／內政部」。

## 關鍵字搜尋

| 關鍵字 | `datasets.total` | 結果 |
|---|---:|---|
| `候選人得票 台北市長` | 0 | 搜尋 API 沒有直接回傳資料集 |
| `行政區 地圖 里界` | 1 | `tw.openfun~entity~geo` |

已達原規格「最多兩次關鍵字搜尋」上限，後續沒有再執行關鍵字搜尋。原始回應保存在 `data/raw/openfun/search-*.json`。

## 選舉分類目錄發現

OpenFun 的既有[選舉分類目錄](https://data.openfun.tw/category/tw.politics.election)列出「各級選舉候選人得票數」，因此在不增加關鍵字搜尋的情況下確認以下四個已知 slug：

| slug | 用途 |
|---|---|
| `tw.gov.cec~ref~election-event` | 確認投票事件與選舉代碼 |
| `tw.gov.cec~ref~candidates` | 取得候選人姓名、代碼與政黨 |
| `tw.gov.cec~txn~candidates-votes` | 取得候選人在 village 層級的得票 |
| `tw.gov.cec~ref~polling-station` | 把投開票所識別碼串接至村里代碼 |

四個資料集的 `skill.md` 與 `knowledge.md` 均已閱讀並保存在各自的 `data/raw/openfun/{slug}/` 目錄。

## 七屆臺北市長選舉

| 年份 | 選舉代碼 | 指定候選人村里／票所列 | 地理對應方式 | 可計分里 |
|---:|---|---:|---|---:|
| 1994 | `ELC-C1-83` | 1,296 | 得票列直接帶村里代碼 | 432 |
| 1998 | `ELC-C1-87` | 864 | 得票列直接帶村里代碼 | 432 |
| 2002 | `ELC-C1-91` | 2,500 | `行政區＋里名`；1 里採跨年 OpenFun 證據 crosswalk | 449 |
| 2006 | `ELC-C1-95` | 2,716 | 投開票所 → 單一村里代碼 | 449 |
| 2010 | `ELC-C1-99` | 3,014 | 投開票所 → 單一村里代碼 | 456 |
| 2014 | `ELC-C1-103` | 3,068 | 投開票所 → 單一村里代碼 | 456 |
| 2022 | `ELC-C1-111` | 3,510 | 投開票所 → 單一村里代碼 | 456 |

原始候選人得票共 16,968 列；依票所彙總後產生 6,692 筆候選人×里資料、3,130 筆逐屆里分數。456 個里全部都有可計算中位數，其中 432 個里具備七屆完整分數，17 個里使用五屆、7 個里使用三屆實際票數。缺少年份不補值；2018 完全未抓取、未計算。

2002 年 `臺北市萬華區糖廍里` 的罕見字元無法直接對上 OpenFun 2022 行政區記錄。人工審查發現 OpenFun 2006 年得票列使用完全相同的里名，且其票所資料明確對應 `63000070-015`；2010 年資料再次確認。因此建立一筆 `manual-cross-year-openfun-evidence` crosswalk。證據全文保存在 `data/config/li_crosswalk.csv`，不是依字形猜測。

## 行政區與里界

`tw.openfun~entity~geo` 的 Records API 以 `_as_of=2022-12-31` 實際取得臺北市 456 個有效里代碼；`_as_of=now` 也是 456 個，ID 集合相同。GIS shapes API 依上述 ID 回傳 456／456 個 polygon。

但 GIS shapes 端點沒有 `_as_of`，Feature properties 只有 `dataset_slug` 與 `record_id`，文件也沒有把目前幾何標為 2022 年版。前端目前顯示與上述 456 個里代碼逐筆相符的 polygon，並明確標示為暫用視覺化邊界；它們不會在介面或文件中被稱為已驗證的 2022 年里界。

## 主要追溯檔案

- `reports/source-audit.csv`：資料集、查詢範圍、筆數與原始檔模式。
- `reports/election-fetch-audit.json`：七屆候選人、票所與得票抓取摘要。
- `reports/election-normalization.json`：村里正規化統計。
- `reports/election-mapping-review.csv`：未分配的原始票所列。
- `reports/geo-version-audit.json`：里代碼與 polygon 版本稽核。
- `data/config/li_crosswalk.csv`：逐年來源里名至 2022 里名的可追溯對照。
