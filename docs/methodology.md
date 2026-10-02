# 方法說明

## 研究定義

本圖以1994至2022年七屆台北市長選舉各里得票資料計算，排除2018年。每屆先計算綠營與藍營候選人的相對得票差距；432個里取七屆中位數，24個較晚成立的里則取成立後可可靠取得之3或5屆實際票數中位數。缺少的早期年份不補值。1994年將趙少康與黃大洲得票合併為藍營；2014年將柯文哲列為綠營；2022年僅比較陳時中與蔣萬安，不納入黃珊珊得票。中位數大於5個百分點列為綠營優勢區，小於負5個百分點列為藍營優勢區，其餘為中立區。資料透過歐噴資料庫取得，原始資料機關依各資料集說明書揭露。

本研究的「藍營」與「綠營」是為了比較歷屆選舉而設定的分類，不應解讀為各政黨的純粹基本盤。

## 選舉範圍

| 年份 | 綠營票 | 藍營票 | 特殊規則 |
|---|---|---|---|
| 1994 | 陳水扁 | 趙少康＋黃大洲 | 兩人藍營票數相加 |
| 1998 | 陳水扁 | 馬英九 | 無 |
| 2002 | 李應元 | 馬英九 | 無 |
| 2006 | 謝長廷 | 郝龍斌 | 無 |
| 2010 | 蘇貞昌 | 郝龍斌 | 無 |
| 2014 | 柯文哲 | 連勝文 | 柯文哲在本研究列為綠營 |
| 2022 | 陳時中 | 蔣萬安 | 黃珊珊及其他候選人完全不納入 |

2018 年完全排除，不擷取、不計算、不進入中位數。七屆權重相同。

## 計算

```text
score = ((green_votes - blue_votes) / (green_votes + blue_votes)) * 100
green_share = (green_votes / (green_votes + blue_votes)) * 100
blue_share = (blue_votes / (green_votes + blue_votes)) * 100
median_score = median(score_1994, score_1998, score_2002, score_2006, score_2010, score_2014, score_2022)
green_median_share = median(green_share_1994, green_share_1998, green_share_2002, green_share_2006, green_share_2010, green_share_2014, green_share_2022)
blue_median_share = median(blue_share_1994, blue_share_1998, blue_share_2002, blue_share_2006, blue_share_2010, blue_share_2014, blue_share_2022)
```

相對得票率的分母只包含規格指定的藍綠兩方票數，不是所有有效票。處理程式保留六位小數，介面才四捨五入到一位；每筆逐屆資料與每筆可用屆次中位數的藍綠相對得票率合計皆為 100%（容許四捨五入誤差）。

優勢模式依 `median_score` 分類；相對得票率模式分別使用 `green_median_share` 與 `blue_median_share`，兩者皆使用固定 35%–65% 色階，不依當前篩選或資料分布自動調整。

## 里界對應

- 連結鍵至少為「行政區＋里名」。
- 只正規化空白、全半形及有無「里」字等明確字元差異，原始名稱保留。
- 一對多、多對一、跨行政區或無法驗證的對應，一律輸出到 `reports/boundary_mapping_review.csv`，不複製、不估算、不平均分配票數。
- 只有七屆分數齊全的里才會產生最終分類。

## 當前限制

指定的 OpenFun 關鍵字搜尋雖未直接回傳得票資料集，但 OpenFun 選舉分類目錄提供 `tw.gov.cec~txn~candidates-votes`、`tw.gov.cec~ref~candidates`、`tw.gov.cec~ref~polling-station` 與 `tw.gov.cec~ref~election-event`。專案已用這四個已知 slug 取得七屆實際資料，沒有增加第三次關鍵字搜尋。

1994、1998 的得票列直接帶村里代碼；2002 依「行政區＋里名」精確對應；2006 以後用投開票所識別碼串接單一村里。任何多里票所、缺少對照或名稱不一致都不拆票、不平均、不複製，改列入 `reports/election-mapping-review.csv`。

目前 456 個 2022-12-31 有效里中，有 432 個具備七屆完整分數。其餘 24 個因早期尚未成立或沒有可可靠對應的早期票數，改以成立後可取得的實際屆次計算：17 里使用 2002、2006、2010、2014、2022 五屆中位數，7 里使用 2010、2014、2022 三屆中位數。缺少年份保留空值，並以 `elections_count`、`years_included`、`calculation_basis` 明確揭露；不把舊里票數拆分、複製或估算到新里。2002 年糖廍里的罕見字元對照，另以 OpenFun 2006、2010 年同名里與票所村里代碼建立可追溯的人工 crosswalk。

行政區資料集文件版本為 2026-05，GIS shapes 端點不支援 `_as_of`，回傳 Feature 也沒有幾何版本欄位。因此目前仍無法獨立驗證 polygon 是 2022 年幾何版本。地圖以 `_as_of=2022-12-31` 取得的 456 個有效里代碼逐筆請求並顯示 OpenFun polygon，同時在介面與 metadata 標示為暫用視覺化邊界；不得據此宣稱為已驗證的 2022 年里界。
