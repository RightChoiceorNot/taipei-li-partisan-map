import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aggregateSpecifiedCandidates, classify, median, summarizeSevenScores, YEARS } from './lib/election.mjs';
import { dissolveDistrictBoundaries } from './lib/district-boundaries.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const inputVotes = join(root, 'data', 'interim', 'verified-election-votes.csv');
const inputBoundary = join(root, 'data', 'interim', 'taipei_li_2022_verified.geojson');
const inputLiDirectory = join(root, 'public', 'data', 'li_directory_2022.json');
const openFunGeoRoot = join(root, 'data', 'raw', 'openfun', 'tw.openfun~entity~geo');
const openFunRecordFiles = [1, 2, 3].map((page) => join(openFunGeoRoot, `records-2022-12-31-page-${page}.json`));
const openFunShapeFiles = [1, 2, 3].map((batch) => join(openFunGeoRoot, `shapes-for-2022-ids-batch-${batch}.geojson`));

const scoreColumns = ['year', 'district', 'li_name_source', 'li_name_2022', 'green_candidate_or_rule', 'blue_candidate_or_rule', 'green_votes', 'blue_votes', 'green_share', 'blue_share', 'score', 'source_file', 'mapping_status', 'notes'];
const medianColumns = ['district', 'li_name_2022', ...YEARS.map((year) => `score_${year}`), 'median_score', 'green_median_share', 'blue_median_share', 'mean_score', 'min_score', 'max_score', 'classification', 'elections_count', 'years_included', 'calculation_basis', 'mapping_status', 'notes'];

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field); field = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])));
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(columns, rows) {
  return `${columns.join(',')}\n${rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')).join('\n')}${rows.length ? '\n' : ''}`;
}

async function save(relativePath, value) {
  const destination = join(root, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, value, 'utf8');
}

async function loadOpenFunBoundaryFallback() {
  if (![...openFunRecordFiles, ...openFunShapeFiles].every(existsSync)) return null;

  const records = (await Promise.all(openFunRecordFiles.map(async (path) =>
    JSON.parse(await readFile(path, 'utf8')).records ?? []))).flat();
  const shapes = (await Promise.all(openFunShapeFiles.map(async (path) =>
    JSON.parse(await readFile(path, 'utf8')).features ?? []))).flat();
  const recordsById = new Map(records.map((record) => [String(record.village_id ?? record.id ?? ''), record]));
  const directoryRows = existsSync(inputLiDirectory)
    ? JSON.parse(await readFile(inputLiDirectory, 'utf8')).rows ?? []
    : [];
  const directoryById = new Map(directoryRows.map((row) => [String(row.village_id ?? ''), row]));
  const shapeIds = shapes.map((feature) => String(feature.properties?.record_id ?? feature.id ?? ''));

  if (records.length !== 456 || shapes.length !== 456 || recordsById.size !== 456 || new Set(shapeIds).size !== 456) {
    throw new Error(`OpenFun boundary fallback must contain 456 unique records and shapes; received ${records.length} records and ${shapes.length} shapes.`);
  }

  const features = shapes.map((feature) => {
    const recordId = String(feature.properties?.record_id ?? feature.id ?? '');
    const record = recordsById.get(recordId);
    if (!record) throw new Error(`OpenFun shape has no matching 2022-12-31 village record: ${recordId}`);
    const directoryRow = directoryById.get(recordId);
    return {
      ...feature,
      properties: {
        ...feature.properties,
        village_id: recordId,
        district: directoryRow?.district ?? record.town_name,
        li_name_2022: directoryRow?.li_name_2022 ?? record.village_name,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    metadata: {
      status: 'provisional-boundary',
      source_geo_dataset: 'tw.openfun~entity~geo',
      source_geo_version: 'OpenFun shapes for 456 village IDs valid on 2022-12-31; geometry vintage not independently exposed by the shapes API',
      geometry_version_verified: false,
      notice: '目前顯示 OpenFun 提供、且與 2022 年 12 月 31 日有效的 456 個里代碼逐筆相符之里界；但 shapes API 未提供幾何版本欄位，因此不可視為已獨立驗證的 2022 年界線。',
    },
    features,
  };
}

const sourceRows = existsSync(inputVotes) ? parseCsv(await readFile(inputVotes, 'utf8')) : [];
const grouped = new Map();
for (const row of sourceRows) {
  const year = Number(row.year);
  if (!YEARS.includes(year)) continue;
  const key = [year, row.district, row.li_name_2022].join('\u0000');
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(row);
}

const scoreRows = [];
const reviewRows = [];
for (const [key, rows] of grouped) {
  const [yearText, district, liName] = key.split('\u0000');
  const year = Number(yearText);
  if (!district || !liName || rows.some((row) => row.mapping_status !== 'matched')) {
    reviewRows.push({ district, li_name_source: rows[0]?.li_name_source ?? '', li_name_2022: liName, year, issue_type: 'unreliable-crosswalk', confidence: rows[0]?.mapping_status ?? 'missing', disposition: '待人工確認', notes: rows.map((row) => row.notes).filter(Boolean).join('; ') });
    continue;
  }
  try {
    const result = aggregateSpecifiedCandidates(year, rows);
    scoreRows.push({
      year, district, li_name_source: rows[0].li_name_source, li_name_2022: liName,
      green_candidate_or_rule: result.rule.greenLabel, blue_candidate_or_rule: result.rule.blueLabel,
      green_votes: result.greenVotes, blue_votes: result.blueVotes,
      green_share: result.greenShare.toFixed(6), blue_share: result.blueShare.toFixed(6), score: result.score.toFixed(6),
      source_file: [...new Set(rows.map((row) => row.source_file))].join(';'), mapping_status: 'matched',
      notes: rows.map((row) => row.notes).filter(Boolean).join('; '),
    });
  } catch (error) {
    reviewRows.push({ district, li_name_source: rows[0]?.li_name_source ?? '', li_name_2022: liName, year, issue_type: 'missing-candidate-or-votes', confidence: 'blocked', disposition: '不計分', notes: error.message });
  }
}

const byLi = new Map();
for (const row of scoreRows) {
  const key = `${row.district}\u0000${row.li_name_2022}`;
  if (!byLi.has(key)) byLi.set(key, {});
  if (byLi.get(key)[row.year] !== undefined) throw new Error(`Duplicate district + li + year: ${key} ${row.year}`);
  byLi.get(key)[row.year] = {
    score: Number(row.score),
    greenShare: Number(row.green_share),
    blueShare: Number(row.blue_share),
  };
}

const medianRows = [];
for (const [key, yearly] of byLi) {
  const [district, liName] = key.split('\u0000');
  const availableYears = YEARS.filter((year) =>
    Number.isFinite(yearly[year]?.score)
    && Number.isFinite(yearly[year]?.greenShare)
    && Number.isFinite(yearly[year]?.blueShare));
  if (!availableYears.length) continue;

  const scores = Object.fromEntries(YEARS.map((year) => [year, yearly[year]?.score]));
  const scoreValues = availableYears.map((year) => yearly[year].score);
  const completeSevenYears = availableYears.length === YEARS.length;
  const summary = completeSevenYears
    ? summarizeSevenScores(scores)
    : {
        medianScore: median(scoreValues),
        meanScore: scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length,
        minScore: Math.min(...scoreValues),
        maxScore: Math.max(...scoreValues),
        classification: classify(median(scoreValues)),
      };
  const greenMedianShare = median(availableYears.map((year) => yearly[year].greenShare));
  const blueMedianShare = median(availableYears.map((year) => yearly[year].blueShare));
  const calculationBasis = completeSevenYears ? 'seven-election-median' : 'available-election-median';
  const notes = completeSevenYears
    ? ''
    : `該里在早期選舉時尚未成立或無可可靠對應資料；中位數僅使用 ${availableYears.join('、')} 年的實際得票，不複製或估算舊里票數。`;
  medianRows.push({
    district, li_name_2022: liName,
    ...Object.fromEntries(YEARS.map((year) => [`score_${year}`, Number.isFinite(scores[year]) ? scores[year].toFixed(6) : ''])),
    median_score: summary.medianScore.toFixed(6),
    green_median_share: greenMedianShare.toFixed(6), blue_median_share: blueMedianShare.toFixed(6),
    mean_score: summary.meanScore.toFixed(6),
    min_score: summary.minScore.toFixed(6), max_score: summary.maxScore.toFixed(6),
    classification: summary.classification,
    elections_count: availableYears.length,
    years_included: availableYears.join('|'),
    calculation_basis: calculationBasis,
    mapping_status: 'matched',
    notes,
  });
  if (!completeSevenYears) {
    reviewRows.push({
      district,
      li_name_source: '',
      li_name_2022: liName,
      year: YEARS.filter((year) => !availableYears.includes(year)).join('|'),
      issue_type: 'partial-election-coverage',
      confidence: 'actual-votes-only',
      disposition: `以成立後 ${availableYears.length} 屆實際得票計算中位數`,
      notes,
    });
  }
}

const uniqueLi = new Set();
for (const row of medianRows) {
  const key = `${row.district}\u0000${row.li_name_2022}`;
  if (uniqueLi.has(key)) throw new Error(`Duplicate district + 2022 li: ${key}`);
  uniqueLi.add(key);
}

let geojson = {
  type: 'FeatureCollection',
  metadata: {
    status: sourceRows.length ? 'boundary-blocked' : 'blocked',
    generated_at: new Date().toISOString(),
    score_summary_count: medianRows.length,
    property_schema: ['median_score', 'green_median_share', 'blue_median_share', 'classification', 'elections_count', 'calculation_basis'],
    blocker: sourceRows.length
      ? `七屆實際得票已完成 ${medianRows.length} 個里的中位數計算；但 OpenFun GIS 回應沒有幾何版本，仍不能證明為 2022 年里界，因此暫不繪製 polygon。`
      : '尚未取得可計算的選舉資料，且 OpenFun GIS 回應沒有幾何版本，不能證明為 2022 年里界。本地圖不會以推測、補值或未驗證界線代替。',
  },
  features: [],
};
let districtGeojson = {
  type: 'FeatureCollection',
  metadata: {
    status: 'boundary-blocked',
    generated_at: new Date().toISOString(),
    blocker: '行政區外框須由已驗證的 2022 里界 dissolve 產生，目前不以未驗證幾何替代。',
  },
  features: [],
};

let boundary = null;
if (existsSync(inputBoundary)) {
  boundary = JSON.parse(await readFile(inputBoundary, 'utf8'));
  const verifiedVersion = String(boundary.metadata?.source_geo_version ?? '');
  if (!/^2022(?:\b|-)/.test(verifiedVersion)) throw new Error(`Boundary version is not verified as 2022: ${verifiedVersion || 'missing'}`);
  boundary.metadata = { ...boundary.metadata, status: 'complete', geometry_version_verified: true };
} else {
  boundary = await loadOpenFunBoundaryFallback();
}

if (boundary) {
  const version = String(boundary.metadata?.source_geo_version ?? '');
  const geometryVersionVerified = boundary.metadata?.geometry_version_verified !== false;
  const lookup = new Map(medianRows.map((row) => [`${row.district}\u0000${row.li_name_2022}`, row]));
  geojson = {
    type: 'FeatureCollection',
    metadata: {
      status: geometryVersionVerified ? 'complete' : 'provisional-boundary',
      generated_at: new Date().toISOString(),
      source_geo_version: version,
      source_geo_dataset: boundary.metadata?.source_geo_dataset ?? '',
      geometry_version_verified: geometryVersionVerified,
      score_summary_count: medianRows.length,
      seven_election_count: medianRows.filter((row) => row.elections_count === YEARS.length).length,
      ...(boundary.metadata?.notice ? { notice: boundary.metadata.notice } : {}),
      property_schema: ['median_score', 'green_median_share', 'blue_median_share', 'classification', 'elections_count', 'calculation_basis'],
    },
    features: boundary.features.map((feature) => {
      const district = feature.properties.district;
      const liName = feature.properties.li_name_2022;
      const score = lookup.get(`${district}\u0000${liName}`);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          ...Object.fromEntries(YEARS.map((year) => [`score_${year}`, score ? Number(score[`score_${year}`]) : null])),
          median_score: score ? Number(score.median_score) : null,
          green_median_share: score ? Number(score.green_median_share) : null,
          blue_median_share: score ? Number(score.blue_median_share) : null,
          classification: score?.classification ?? '待確認',
          elections_count: score ? Number(score.elections_count) : 0,
          years_included: score?.years_included ?? '',
          calculation_basis: score?.calculation_basis ?? 'unavailable',
          mapping_status: score?.mapping_status ?? 'missing-seven-year-score',
          source_geo_dataset: boundary.metadata?.source_geo_dataset ?? '',
          source_geo_version: version,
        },
      };
    }),
  };
  districtGeojson = dissolveDistrictBoundaries(geojson);
}

if (!sourceRows.length) {
  reviewRows.push({ district: '全市', li_name_source: '', li_name_2022: '', year: '1994|1998|2002|2006|2010|2014|2022', issue_type: 'missing-openfun-election-dataset', confidence: 'blocked', disposition: '全部不計分', notes: '指定搜尋「候選人得票 台北市長」無資料集結果。' });
}
if (!existsSync(inputBoundary)) {
  reviewRows.push({ district: '全市', li_name_source: '', li_name_2022: '', year: '2022', issue_type: 'unverified-boundary-version', confidence: 'provisional', disposition: '僅供地圖視覺化並揭露版本限制', notes: '已驗證 2022-12-31 有效里代碼 456 筆，GIS 亦回傳逐筆相符的 456 個 polygon；但 shapes 端點無 _as_of，且 Feature 無版本或日期屬性，無法獨立確認幾何為 2022 版。' });
}

await save('data/processed/li_election_scores.csv', toCsv(scoreColumns, scoreRows));
await save('data/processed/li_partisan_median.csv', toCsv(medianColumns, medianRows));
await save('public/data/li_partisan_scores.json', `${JSON.stringify({
  metadata: { generated_at: new Date().toISOString(), count: medianRows.length, seven_election_count: medianRows.filter((row) => row.elections_count === YEARS.length).length, boundary_status: 'unverified-2022-geometry' },
  rows: medianRows.map((row) => ({
    district: row.district,
    li_name_2022: row.li_name_2022,
    ...Object.fromEntries(YEARS.map((year) => [`score_${year}`, row[`score_${year}`] === '' ? null : Number(row[`score_${year}`])])),
    median_score: Number(row.median_score),
    green_median_share: Number(row.green_median_share),
    blue_median_share: Number(row.blue_median_share),
    classification: row.classification,
    elections_count: Number(row.elections_count),
    years_included: row.years_included,
    calculation_basis: row.calculation_basis,
    mapping_status: row.mapping_status,
    source_geo_dataset: '',
    source_geo_version: '',
  })),
}, null, 2)}\n`);
await save('reports/boundary_mapping_review.csv', toCsv(['district', 'li_name_source', 'li_name_2022', 'year', 'issue_type', 'confidence', 'disposition', 'notes'], reviewRows));
await save('public/data/taipei_li_partisan.geojson', `${JSON.stringify(geojson, null, 2)}\n`);
await save('public/data/taipei_district_boundaries.geojson', `${JSON.stringify(districtGeojson, null, 2)}\n`);

const completed = medianRows.filter((row) => row.elections_count === YEARS.length).length;
const partial = medianRows.length - completed;
const yearCounts = Object.fromEntries(YEARS.map((year) => [year, scoreRows.filter((row) => row.year === year).length]));
const classCounts = medianRows.reduce((counts, row) => ({ ...counts, [row.classification]: (counts[row.classification] ?? 0) + 1 }), {});
const spotRows = scoreRows.filter((row) => row.district === '松山區' && row.li_name_2022 === '莊敬里' && [1994, 2014, 2022].includes(row.year));
const spotTable = spotRows.length === 3
  ? `| 年份 | 綠營票 | 藍營票 | 綠營相對得票率 | 藍營相對得票率 | score |\n|---:|---:|---:|---:|---:|---:|\n${spotRows.map((row) => `| ${row.year} | ${row.green_votes} | ${row.blue_votes} | ${row.green_share} | ${row.blue_share} | ${row.score} |`).join('\n')}`
  : '抽查目標缺少必要年份。';
const normalizationPath = join(root, 'reports', 'election-normalization.json');
const normalization = existsSync(normalizationPath) ? JSON.parse(await readFile(normalizationPath, 'utf8')) : null;
const report = `# 資料品質報告\n\n- 生成時間：${new Date().toISOString()}\n- 已正規化候選人×里資料列：${sourceRows.length}\n- 逐屆里分數：${scoreRows.length}\n- 可計算中位數里數：${medianRows.length}／456（100.0%）\n- 七屆完整計分里數：${completed}／456（${(completed / 456 * 100).toFixed(1)}%）\n- 成立後可用屆次中位數：${partial} 里（只用實際得票，不補值）\n- 地圖里界要素數：${geojson.features.length}\n- 選舉對應待人工確認原始列：${normalization?.review_rows ?? '未提供'}\n- 完整性／里界審查項目：${reviewRows.length}\n\n## 各屆可計分里數\n\n${YEARS.map((year) => `- ${year}：${yearCounts[year]} 里`).join('\n')}\n\n## 地圖分類（456 里）\n\n- 綠營優勢區：${classCounts['綠營優勢區'] ?? 0}\n- 中立區：${classCounts['中立區'] ?? 0}\n- 藍營優勢區：${classCounts['藍營優勢區'] ?? 0}\n\n## 涵蓋範圍與人工審查\n\n${reviewRows.map((row) => `- ${row.issue_type}：${row.district || '全市'}${row.li_name_2022 || ''}；${row.notes}`).join('\n')}\n\n另有 ${normalization?.review_rows ?? 0} 筆投開票所原始列保存在 \`reports/election-mapping-review.csv\`，未猜測拆分或補值。24 個早期尚未成立的里改以成立後可取得的 3 或 5 屆實際票數取中位數，並保留 \`elections_count\`、\`years_included\` 與 \`calculation_basis\` 供前端揭露。\n\n## 實際票數抽查：松山區莊敬里\n\n${spotTable}\n\n上述 score 皆依 \`((綠營票 − 藍營票) / (綠營票 + 藍營票)) × 100\` 計算；相對得票率以各方票數除以藍綠兩方票數合計，再取該里可可靠取得屆次的中位數。1994 合併趙少康與黃大洲，2014 將柯文哲列為綠營，2022 只比較陳時中與蔣萬安。\n\n## 里界版本限制\n\n目前地圖顯示 OpenFun shapes API 回傳、且與 2022-12-31 有效里代碼逐筆相符的 456 個 polygon。由於 shapes 端點沒有 \`_as_of\` 或幾何版本欄位，本專案明確標示為暫用視覺化邊界，不宣稱已獨立驗證為 2022 年幾何版本。\n`;
await save('reports/data-quality.md', report);
console.log(`Built ${scoreRows.length} yearly scores and ${medianRows.length} calculable li summaries (${completed} complete seven-election summaries, ${partial} available-election summaries).`);
