import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_DISTRICTS,
  ALL_VILLAGES,
  districtFlipSummary,
  districtSummary,
  featureEmphasis,
  featureFillPresentation,
  FLIP_BLUE_COLOR,
  FLIP_GREEN_COLOR,
  FLIP_NONE_COLOR,
  flipHistory,
  focusTarget,
  INITIAL_SELECTION,
  PARTISAN_BLUE_COLORS,
  PARTISAN_GREEN_COLORS,
  PARTISAN_NEUTRAL_COLOR,
  partisanScaleColor,
  selectionFocusKey,
  selectionReducer,
  shouldBindFeatureTooltip,
  VILLAGE_PROMPT,
  villageOptions,
} from '../lib/map-model.ts';

const summaryRows = [
  { district: '松山區', classification: '綠營優勢區' },
  { district: '松山區', classification: '藍營優勢區' },
  { district: '松山區', classification: '中立區' },
  { district: '信義區', classification: '綠營優勢區' },
];

const directory = [
  { district: '松山區', li_name_2022: '莊敬里', village_id: '63000010-002', sort_key: '63000010-002' },
  { district: '信義區', li_name_2022: '西村里', village_id: '63000020-003', sort_key: '63000020-003' },
  { district: '松山區', li_name_2022: '中華里', village_id: '63000010-001', sort_key: '63000010-001' },
];

void test('切換全部行政區與各區時，里數與藍綠優勢統計同步更新', () => {
  assert.deepEqual(districtSummary(summaryRows, ALL_DISTRICTS), { total: 4, green: 2, blue: 1, neutral: 1 });
  assert.deepEqual(districtSummary(summaryRows, '松山區'), { total: 3, green: 1, blue: 1, neutral: 1 });
  assert.deepEqual(districtSummary(summaryRows, '信義區'), { total: 1, green: 1, blue: 0, neutral: 0 });
});

void test('翻轉模式依全市或行政區統計藍轉綠與綠轉藍里數', () => {
  const rows = [
    { district: '甲區', classification: '藍營優勢區', median_score: -8, green_median_share: 46, blue_median_share: 54, mapping_status: 'matched', score_2014: 12 },
    { district: '甲區', classification: '藍營優勢區', median_score: -9, green_median_share: 45, blue_median_share: 55, mapping_status: 'matched', score_2014: -4 },
    { district: '甲區', classification: '綠營優勢區', median_score: 11, green_median_share: 55.5, blue_median_share: 44.5, mapping_status: 'matched', score_2002: -3 },
    { district: '乙區', classification: '綠營優勢區', median_score: 12, green_median_share: 56, blue_median_share: 44, mapping_status: 'matched', score_2002: 5 },
  ];
  assert.deepEqual(districtFlipSummary(rows, ALL_DISTRICTS), { blueToGreen: 1, greenToBlue: 1 });
  assert.deepEqual(districtFlipSummary(rows, '甲區'), { blueToGreen: 1, greenToBlue: 1 });
  assert.deepEqual(districtFlipSummary(rows, '乙區'), { blueToGreen: 0, greenToBlue: 0 });
});

void test('選定行政區後，里別清單只包含該區並依官方代碼排序', () => {
  assert.deepEqual(villageOptions(directory, '松山區'), ['中華里', '莊敬里']);
  assert.deepEqual(villageOptions(directory, '信義區'), ['西村里']);
  assert.deepEqual(villageOptions(directory, ALL_DISTRICTS), []);
});

void test('切換行政區會清除舊里，切回全市會恢復停用提示', () => {
  let state = selectionReducer(INITIAL_SELECTION, { type: 'select-feature', district: '松山區', village: '莊敬里' });
  state = selectionReducer(state, { type: 'select-district', district: '信義區' });
  assert.equal(state.district, '信義區');
  assert.equal(state.village, ALL_VILLAGES);
  state = selectionReducer(state, { type: 'select-district', district: ALL_DISTRICTS });
  assert.equal(state.village, VILLAGE_PROMPT);
  assert.deepEqual(focusTarget(state), { scope: 'city' });
});

void test('選定里後會產生里範圍縮放目標與醒目描邊', () => {
  const state = selectionReducer(INITIAL_SELECTION, { type: 'select-feature', district: '松山區', village: '莊敬里' });
  assert.deepEqual(focusTarget(state), { scope: 'village', district: '松山區', village: '莊敬里' });
  assert.deepEqual(featureEmphasis({ district: '松山區', li_name_2022: '莊敬里' }, state), {
    inDistrict: true, isVillage: true, fillOpacity: 0.96, lineWeight: 3.5,
  });
  assert.equal(featureEmphasis({ district: '信義區', li_name_2022: '西村里' }, state).fillOpacity, 0.16);
});

void test('關閉里別詳細資料後保留行政區並回到該區全部里', () => {
  let state = selectionReducer(INITIAL_SELECTION, { type: 'select-feature', district: '士林區', village: '溪山里' });
  state = selectionReducer(state, { type: 'select-village', village: ALL_VILLAGES });
  assert.equal(state.district, '士林區');
  assert.equal(state.village, ALL_VILLAGES);
  assert.deepEqual(focusTarget(state), { scope: 'district', district: '士林區' });
  assert.equal(shouldBindFeatureTooltip({ district: '士林區', li_name_2022: '溪山里' }, state, true), false);
});

void test('手機僅替目前選取里建立資料卡，避免關閉後跳到其他里', () => {
  const state = selectionReducer(INITIAL_SELECTION, { type: 'select-feature', district: '士林區', village: '溪山里' });
  assert.equal(shouldBindFeatureTooltip({ district: '士林區', li_name_2022: '溪山里' }, state, true), true);
  assert.equal(shouldBindFeatureTooltip({ district: '士林區', li_name_2022: '平等里' }, state, true), false);
  assert.equal(shouldBindFeatureTooltip({ district: '士林區', li_name_2022: '平等里' }, state, false), true);
});

void test('切換四種地圖模式保留行政區與里別狀態', () => {
  let state = selectionReducer(INITIAL_SELECTION, { type: 'select-feature', district: '松山區', village: '莊敬里' });
  const focusKey = selectionFocusKey(state);
  const viewport = { center: [25.05, 121.55], zoom: 15 };
  for (const mode of ['partisan', 'green-rate', 'blue-rate', 'flip'] as const) {
    state = selectionReducer(state, { type: 'set-mode', mode });
    assert.equal(state.district, '松山區');
    assert.equal(state.village, '莊敬里');
    assert.equal(state.mode, mode);
    assert.equal(selectionFocusKey(state), focusKey);
    assert.deepEqual(viewport, { center: [25.05, 121.55], zoom: 15 });
  }
});

void test('翻轉模式以長期分類為原本陣營並標出對手勝出的年份', () => {
  const row = {
    median_score: -8,
    green_median_share: 46,
    blue_median_share: 54,
    classification: '藍營優勢區',
    mapping_status: 'matched',
    score_1994: -12,
    score_1998: -4,
    score_2002: 14,
    score_2006: 3,
    score_2010: -18,
    score_2014: -2,
    score_2022: 9,
  };
  assert.deepEqual(flipHistory(row).map((flip) => flip.label), [
    '2002 藍翻綠',
    '2006 藍翻綠',
    '2022 藍翻綠',
  ]);
  assert.equal(featureFillPresentation(row, 'flip').fillColor, FLIP_GREEN_COLOR);
});

void test('回到原本陣營不會反向著色，未翻轉里與中立里使用灰色', () => {
  const greenBaseline = {
    median_score: 10,
    green_median_share: 55,
    blue_median_share: 45,
    classification: '綠營優勢區',
    mapping_status: 'matched',
    score_1994: 12,
    score_2002: -14,
    score_2014: 18,
  };
  const neverFlipped = { ...greenBaseline, score_2002: 14 };
  const neutral = { ...greenBaseline, classification: '中立區' };
  assert.deepEqual(flipHistory(greenBaseline).map((flip) => flip.label), ['2002 綠翻藍']);
  assert.equal(featureFillPresentation(greenBaseline, 'flip').fillColor, FLIP_BLUE_COLOR);
  assert.equal(featureFillPresentation(neverFlipped, 'flip').fillColor, FLIP_NONE_COLOR);
  assert.equal(featureFillPresentation(neutral, 'flip').fillColor, FLIP_NONE_COLOR);
});

void test('待確認里在四種模式使用完全相同的斜線紋理', () => {
  const pending = {
    median_score: null,
    green_median_share: null,
    blue_median_share: null,
    classification: '待確認',
    mapping_status: 'missing-seven-year-score',
  };
  const presentations = (['partisan', 'green-rate', 'blue-rate', 'flip'] as const).map((mode) => featureFillPresentation(pending, mode));
  assert.deepEqual(presentations[0], presentations[1]);
  assert.deepEqual(presentations[1], presentations[2]);
  assert.deepEqual(presentations[2], presentations[3]);
  assert.equal(presentations[0].className, 'pending-li');
});

void test('固定百分比在藍綠模式使用相同門檻位置但不同單色系', () => {
  const row = {
    median_score: 10,
    green_median_share: 55,
    blue_median_share: 45,
    classification: '綠營優勢區',
    mapping_status: 'matched',
  };
  assert.match(featureFillPresentation(row, 'green-rate').fillColor, /^#[0-9a-f]{6}$/i);
  assert.match(featureFillPresentation(row, 'blue-rate').fillColor, /^#[0-9a-f]{6}$/i);
  assert.notEqual(featureFillPresentation(row, 'green-rate').fillColor, featureFillPresentation(row, 'blue-rate').fillColor);
});

void test('藍綠差距以 ±5 中立及五級藍綠色階呈現', () => {
  assert.equal(partisanScaleColor(-5), PARTISAN_NEUTRAL_COLOR);
  assert.equal(partisanScaleColor(0), PARTISAN_NEUTRAL_COLOR);
  assert.equal(partisanScaleColor(5), PARTISAN_NEUTRAL_COLOR);
  assert.equal(partisanScaleColor(-6), PARTISAN_BLUE_COLORS[0]);
  assert.equal(partisanScaleColor(-9.9), PARTISAN_BLUE_COLORS[0]);
  assert.equal(partisanScaleColor(-10), PARTISAN_BLUE_COLORS[1]);
  assert.equal(partisanScaleColor(-20), PARTISAN_BLUE_COLORS[2]);
  assert.equal(partisanScaleColor(-30), PARTISAN_BLUE_COLORS[3]);
  assert.equal(partisanScaleColor(-40), PARTISAN_BLUE_COLORS[4]);
  assert.equal(partisanScaleColor(-60), PARTISAN_BLUE_COLORS.at(-1));
  assert.equal(partisanScaleColor(6), PARTISAN_GREEN_COLORS[0]);
  assert.equal(partisanScaleColor(10), PARTISAN_GREEN_COLORS[1]);
  assert.equal(partisanScaleColor(20), PARTISAN_GREEN_COLORS[2]);
  assert.equal(partisanScaleColor(30), PARTISAN_GREEN_COLORS[3]);
  assert.equal(partisanScaleColor(40), PARTISAN_GREEN_COLORS[4]);
  assert.equal(partisanScaleColor(60), PARTISAN_GREEN_COLORS.at(-1));
});
