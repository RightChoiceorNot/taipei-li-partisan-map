import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const votesSlug = 'tw.gov.cec~txn~candidates-votes';
const pollingSlug = 'tw.gov.cec~ref~polling-station';
const geoSlug = 'tw.openfun~entity~geo';
const verifiedManualCrosswalks = new Map([
  [
    '2002\u0000萬華區\u0000糖廍里',
    {
      targetId: '63000070-015',
      evidence: 'OpenFun 2006 得票列的「臺北市萬華區糖廍里」經 polling-station 明確對應 63000070-015；2010 年資料再次確認。',
    },
  ],
]);
const verifiedTargetNameOverrides = new Map([
  ['63000070-015', '糖廍里'],
]);

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(columns, rows) {
  const lines = [columns.join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))];
  return `${lines.join('\n')}\n`;
}

async function save(relativePath, value) {
  const destination = join(root, relativePath);
  await mkdir(join(destination, '..'), { recursive: true });
  await writeFile(destination, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function loadJsonPages(directory, prefix = '') {
  const names = (await readdir(directory)).filter((name) => name.startsWith(prefix) && /-page-\d+\.json$/.test(name)).sort();
  const records = [];
  for (const name of names) {
    const body = JSON.parse(await readFile(join(directory, name), 'utf8'));
    for (const record of body.records ?? []) {
      records.push({ ...record, __sourceFile: relative(root, join(directory, name)).replaceAll('\\', '/') });
    }
  }
  return records;
}

const fetchAudit = JSON.parse(await readFile(join(root, 'reports', 'election-fetch-audit.json'), 'utf8'));
const geoDirectory = join(root, 'data', 'raw', 'openfun', geoSlug);
const geoRecords = await loadJsonPages(geoDirectory, 'records-2022-12-31');
const geoById = new Map(geoRecords.map((record) => [record.village_id ?? record.id, record]));
const geoByDistrictLi = new Map(
  geoRecords.map((record) => [`${record.town_name}\u0000${record.village_name}`, record]),
);
const liDirectory = geoRecords
  .map((record) => {
    const villageId = record.village_id ?? record.id;
    return {
      district: record.town_name,
      li_name_2022: verifiedTargetNameOverrides.get(villageId) ?? record.village_name,
      village_id: villageId,
      sort_key: villageId,
    };
  })
  .sort((a, b) => a.district.localeCompare(b.district, 'zh-Hant') || a.sort_key.localeCompare(b.sort_key, 'zh-Hant'));

const interimRows = [];
const crosswalk = new Map();
const reviewRows = [];
const summary = {
  generated_at: new Date().toISOString(),
  source: 'OpenFun / 中央選舉委員會',
  target_boundary_record_date: '2022-12-31',
  target_li_records: geoRecords.length,
  elections: [],
};

function parseSourceLocation(value) {
  const match = String(value ?? '').match(/^[臺台]北市(.+?區)(.+里)$/);
  return match ? { district: match[1], liName: match[2] } : null;
}

for (const election of fetchAudit.elections) {
  const year = Number(election.year);
  const votesDirectory = join(root, 'data', 'raw', 'openfun', votesSlug, String(year));
  const pollingDirectory = join(root, 'data', 'raw', 'openfun', pollingSlug, String(year));
  const voteRows = await loadJsonPages(votesDirectory);
  const pollingRows = await loadJsonPages(pollingDirectory, 'taipei-polling-stations');
  const pollingById = new Map(pollingRows.map((record) => [record.識別碼, record]));
  const candidateNames = new Map(
    election.target_candidates
      .filter((candidate) => candidate.candidate_code)
      .map((candidate) => [candidate.candidate_code, candidate.name]),
  );
  const aggregate = new Map();
  let matchedRawRows = 0;
  let unresolvedRawRows = 0;

  for (const row of voteRows) {
    const candidateName = candidateNames.get(row.候選人代碼);
    if (!candidateName) continue;

    const sourceLocation = parseSourceLocation(row.選區);
    let targetRecord = null;
    let mappingType = '';
    let issueType = '';

    if (row.行政區代碼 && geoById.has(row.行政區代碼)) {
      targetRecord = geoById.get(row.行政區代碼);
      mappingType = 'exact-village-id';
    } else if (row.投開票所識別碼 && pollingById.has(row.投開票所識別碼)) {
      const villageIds = pollingById.get(row.投開票所識別碼).村里代碼 ?? [];
      if (villageIds.length === 1 && geoById.has(villageIds[0])) {
        targetRecord = geoById.get(villageIds[0]);
        mappingType = 'polling-station-single-village';
      } else if (villageIds.length > 1) {
        issueType = 'multi-village-polling-station';
      } else {
        issueType = 'polling-station-village-not-in-2022';
      }
    } else if (sourceLocation) {
      const key = `${sourceLocation.district}\u0000${sourceLocation.liName}`;
      if (geoByDistrictLi.has(key)) {
        targetRecord = geoByDistrictLi.get(key);
        mappingType = 'exact-district-li-name';
      } else if (verifiedManualCrosswalks.has(`${year}\u0000${key}`)) {
        const override = verifiedManualCrosswalks.get(`${year}\u0000${key}`);
        targetRecord = geoById.get(override.targetId) ?? null;
        mappingType = 'manual-cross-year-openfun-evidence';
        if (!targetRecord) issueType = 'verified-target-id-not-in-2022';
      } else {
        issueType = 'source-name-not-in-2022';
      }
    } else {
      issueType = row.投開票所識別碼 ? 'missing-polling-station-crosswalk' : 'unrecognized-source-location';
    }

    if (!targetRecord) {
      unresolvedRawRows += 1;
      reviewRows.push({
        year,
        candidate_name: candidateName,
        source_location: row.選區 ?? '',
        polling_station_id: row.投開票所識別碼 ?? '',
        issue_type: issueType,
        disposition: '不分配至任何里',
        votes: row.得票數,
        source_file: row.__sourceFile,
        notes: '未以猜測、平均或複製方式拆分票數；需人工確認後另建 crosswalk。',
      });
      continue;
    }

    matchedRawRows += 1;
    const targetId = targetRecord.village_id ?? targetRecord.id;
    const targetLiName = verifiedTargetNameOverrides.get(targetId) ?? targetRecord.village_name;
    const aggregateKey = `${year}\u0000${targetId}\u0000${candidateName}`;
    if (!aggregate.has(aggregateKey)) {
      aggregate.set(aggregateKey, {
        year,
        district: targetRecord.town_name,
        li_name_source: sourceLocation?.liName ?? targetLiName,
        li_name_2022: targetLiName,
        candidate_name: candidateName,
        votes: 0,
        sourceFiles: new Set(),
        mappingTypes: new Set(),
      });
    }
    const item = aggregate.get(aggregateKey);
    item.votes += Number(row.得票數);
    item.sourceFiles.add(row.__sourceFile);
    item.mappingTypes.add(mappingType);

    const crosswalkKey = `${year}\u0000${sourceLocation?.district ?? targetRecord.town_name}\u0000${sourceLocation?.liName ?? targetLiName}\u0000${targetId}`;
    crosswalk.set(crosswalkKey, {
      source_year: year,
      district: targetRecord.town_name,
      li_name_source: sourceLocation?.liName ?? targetLiName,
      li_name_2022: targetLiName,
      mapping_type: mappingType,
      confidence: 'verified',
      source_evidence: mappingType === 'polling-station-single-village'
        ? `${pollingSlug}.識別碼 → 村里代碼 → ${geoSlug}`
        : mappingType === 'manual-cross-year-openfun-evidence'
          ? verifiedManualCrosswalks.get(`${year}\u0000${sourceLocation.district}\u0000${sourceLocation.liName}`).evidence
          : `${votesSlug} → ${geoSlug}`,
      notes: `target_village_id=${targetId}`,
    });
  }

  for (const item of aggregate.values()) {
    interimRows.push({
      year: item.year,
      district: item.district,
      li_name_source: item.li_name_source,
      li_name_2022: item.li_name_2022,
      candidate_name: item.candidate_name,
      votes: item.votes,
      source_file: [...item.sourceFiles].sort((a, b) => a.localeCompare(b)).join(';'),
      mapping_status: 'matched',
      notes: [...item.mappingTypes].sort((a, b) => a.localeCompare(b)).join(';'),
    });
  }

  summary.elections.push({
    year,
    raw_vote_rows: voteRows.length,
    polling_station_rows: pollingRows.length,
    matched_raw_rows: matchedRawRows,
    unresolved_raw_rows: unresolvedRawRows,
    matched_2022_li: new Set([...aggregate.values()].map((item) => `${item.district}\u0000${item.li_name_2022}`)).size,
    normalized_candidate_li_rows: aggregate.size,
  });
}

interimRows.sort((a, b) => a.year - b.year || a.district.localeCompare(b.district, 'zh-Hant') || a.li_name_2022.localeCompare(b.li_name_2022, 'zh-Hant') || a.candidate_name.localeCompare(b.candidate_name, 'zh-Hant'));
const crosswalkRows = [...crosswalk.values()].sort((a, b) => a.source_year - b.source_year || a.district.localeCompare(b.district, 'zh-Hant') || a.li_name_source.localeCompare(b.li_name_source, 'zh-Hant'));
reviewRows.sort((a, b) => a.year - b.year || a.source_location.localeCompare(b.source_location, 'zh-Hant') || a.candidate_name.localeCompare(b.candidate_name, 'zh-Hant'));

await save(
  'data/interim/verified-election-votes.csv',
  toCsv(['year', 'district', 'li_name_source', 'li_name_2022', 'candidate_name', 'votes', 'source_file', 'mapping_status', 'notes'], interimRows),
);
await save(
  'data/config/li_crosswalk.csv',
  toCsv(['source_year', 'district', 'li_name_source', 'li_name_2022', 'mapping_type', 'confidence', 'source_evidence', 'notes'], crosswalkRows),
);
await save(
  'reports/election-mapping-review.csv',
  toCsv(['year', 'candidate_name', 'source_location', 'polling_station_id', 'issue_type', 'disposition', 'votes', 'source_file', 'notes'], reviewRows),
);
await save('public/data/li_directory_2022.json', {
  metadata: {
    generated_at: new Date().toISOString(),
    source: 'OpenFun tw.openfun~entity~geo records',
    as_of: '2022-12-31',
    count: liDirectory.length,
  },
  rows: liDirectory,
});
summary.normalized_rows = interimRows.length;
summary.crosswalk_rows = crosswalkRows.length;
summary.review_rows = reviewRows.length;
await save('reports/election-normalization.json', summary);
console.log(JSON.stringify(summary, null, 2));
