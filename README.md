# taipei-li-partisan-map

臺北市里級市長選舉政黨傾向互動地圖。前端使用 React、TypeScript、Vite 與 Leaflet；資料流程只接受歐噴資料庫（OpenFun）來源，並保留原始 API 回應、來源稽核、跨年里名對照與品質報告。

介面提供「藍綠優勢分布」、「綠營相對得票率」與「藍營相對得票率」三種模式。行政區與里別採連動下拉選單，選取後會縮放並高亮目標；選取狀態在模式切換時保留。行政區外框由里界依 `district` dissolve 產生，使用淺色 halo 加深灰藍線的雙層描邊，並在放大後顯示行政區名，不修改來源里界 GeoJSON。

目前已取得 1994、1998、2002、2006、2010、2014、2022 七屆實際候選人得票，排除 2018。456 個 2022 時點有效里全部都有可計算中位數：432 個里具備七屆完整分數，17 個較晚成立的里使用 2002–2022 五屆實際票數，7 個使用 2010–2022 三屆實際票數。缺少的早期年份保持空值，不拆分、複製或估算舊里票數。前端顯示 OpenFun 依這 456 個里代碼回傳的 polygon；由於 GIS shapes API 沒有幾何版本欄位，介面與文件均標示為暫用視覺化邊界，不宣稱已獨立驗證為 2022 年幾何版本。

## 本機執行

需要 Node.js 22.13 以上。

```powershell
cd "C:\Users\bohem\Desktop\VOTE\#My Project\taipei-council-performance-db\taipei-li-partisan-map"
npm install
npm run data:normalize-election
npm run data:build
npm test
npm run dev
```

瀏覽器開啟 `http://127.0.0.1:5173/`。由於目前路徑含 `#`，`scripts/run-vite.mjs` 會在 Windows 暫時映射磁碟代號，讓 Vite 正常處理路徑，結束時自動清除。

## OpenFun 資料流程

原規格只允許最多兩次關鍵字搜尋，已完成並保存：

1. `候選人得票 台北市長`：搜尋 API 回傳 0 個資料集。
2. `行政區 地圖 里界`：找到 `tw.openfun~entity~geo`。

後續沒有增加關鍵字搜尋，而是從 OpenFun 選舉分類目錄確認四個已知 slug：

- `tw.gov.cec~ref~election-event`
- `tw.gov.cec~ref~candidates`
- `tw.gov.cec~txn~candidates-votes`
- `tw.gov.cec~ref~polling-station`

請勿再次執行 `data:fetch`，除非使用者明確放寬搜尋次數。重新抓取已知選舉資料時使用：

```powershell
$env:OPENFUN_TOKEN = "<your-token>"
npm run data:fetch-election
npm run data:normalize-election
npm run data:build
```

若沒有 `OPENFUN_TOKEN`，可依 OpenFun Device Authorization Grant 取得短效 token。Token 只存在程序記憶體，不寫入專案。

里界版本稽核使用：

```powershell
$env:OPENFUN_TOKEN = "<your-token>"
npm run data:audit-geo
```

## 地理對應規則

- 1994、1998：得票列直接帶村里代碼，以代碼精確對應 2022 時點里清單。
- 2002：OpenFun 沒有該屆投開票所對照，使用得票列的「行政區＋里名」精確對應。
- 2006、2010、2014、2022：以投開票所識別碼串 `polling-station`，只接受恰好對應一個村里的票所。
- 多里票所、缺少對照、名稱不一致均不拆票、不平均、不複製，輸出至 `reports/election-mapping-review.csv`。
- 只有七屆分數齊全的里才計算中位數與分類。

2002 年萬華區糖廍里的罕見字元無法直接對上 2022 記錄；專案以 OpenFun 2006、2010 年「同名里 → `63000070-015`」的票所對照作為人工 crosswalk 證據，沒有依字形猜測。

## 計算方法

```text
score = ((green_votes - blue_votes) / (green_votes + blue_votes)) * 100
green_share = (green_votes / (green_votes + blue_votes)) * 100
blue_share = (blue_votes / (green_votes + blue_votes)) * 100
```

| 年份 | 綠營票 | 藍營票 |
|---:|---|---|
| 1994 | 陳水扁 | 趙少康＋黃大洲 |
| 1998 | 陳水扁 | 馬英九 |
| 2002 | 李應元 | 馬英九 |
| 2006 | 謝長廷 | 郝龍斌 |
| 2010 | 蘇貞昌 | 郝龍斌 |
| 2014 | 柯文哲 | 連勝文 |
| 2022 | 陳時中 | 蔣萬安 |

中位數大於 +5 為綠營優勢區，小於 −5 為藍營優勢區，其餘為中立區。綠營與藍營相對得票率各自取該里可可靠取得屆次的中位數，兩者合計為 100%；兩種得票率地圖均使用固定 35%–65% 色階。完整定義見 `docs/methodology.md`。

## 目前結果

- 正規化候選人×里資料：6,692 筆。
- 逐屆里分數：3,130 筆。
- 可計算中位數：456／456（100%）。
- 七屆完整里：432／456（94.7%）。
- 成立後五屆中位數：17 里；成立後三屆中位數：7 里。
- 綠營優勢區：97 里。
- 中立區：59 里。
- 藍營優勢區：300 里。
- 地圖里界：456 個 polygon；行政區外框：12 個。
- 可驗證為 2022 年版的 polygon：0。

## 重要輸出

- `data/raw/openfun/`：OpenFun manuals、事件、候選人、得票、票所、行政區與 GIS 原始回應。
- `data/interim/verified-election-votes.csv`：可追溯的候選人×里彙總。
- `data/processed/li_election_scores.csv`：逐屆逐里分數，以及 `green_share`、`blue_share`。
- `data/processed/li_partisan_median.csv`：七屆差距中位數、`green_median_share`、`blue_median_share` 與分類。
- `data/config/li_crosswalk.csv`：歷年來源里至 2022 里名對照。
- `public/data/li_partisan_scores.json`：前端可搜尋的 456 里實際分數與屆次涵蓋欄位。
- `public/data/li_directory_2022.json`：456 里／12 行政區的 2022 動態選單目錄，依官方里代碼排序。
- `public/data/taipei_li_partisan.geojson`：456 筆里界與計分屬性；metadata 明確揭露幾何版本尚未獨立驗證。
- `public/data/taipei_district_boundaries.geojson`：由上述里界依行政區 dissolve 的 12 筆獨立外框，不修改 OpenFun 原始 GeoJSON。
- `reports/election-fetch-audit.json`：選舉抓取摘要。
- `reports/election-normalization.json`：正規化統計。
- `reports/election-mapping-review.csv`：未分配的原始票所列。
- `reports/boundary_mapping_review.csv`：缺年與里界版本審查。
- `reports/data-quality.md`：涵蓋率、分類統計及實際票數抽查。
- `reports/source-audit.csv`：完整資料追溯。

資料來源：歐噴資料庫（data.openfun.tw）／中央選舉委員會／內政部。
