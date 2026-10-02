import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const slug = 'tw.openfun~entity~geo';
const recordsEndpoint = `https://data.openfun.tw/api/v1/datasets/${slug}/records`;
const shapesEndpoint = `https://data.openfun.tw/api/v1/geo/shapes/${slug}`;
const rawDir = join(root, 'data', 'raw', 'openfun', slug);

if (!process.env.OPENFUN_TOKEN) {
  throw new Error('OPENFUN_TOKEN is required. Use the documented OpenFun Device Authorization flow first.');
}

async function save(relativePath, value) {
  const destination = join(root, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  const content = typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(destination, content, 'utf8');
}

async function fetchChecked(url, responseType = 'json') {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.OPENFUN_TOKEN}` },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return responseType === 'text' ? response.text() : response.json();
}

async function fetchRecords(asOf, fileLabel) {
  const records = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (records.length < total) {
    const params = new URLSearchParams({
      level: 'village',
      county_id: '63000',
      _as_of: asOf,
      page: String(page),
      per_page: '200',
    });
    const body = await fetchChecked(`${recordsEndpoint}?${params}`);
    await save(`data/raw/openfun/${slug}/records-${fileLabel}-page-${page}.json`, body);
    const batch = Array.isArray(body.records) ? body.records : [];
    total = Number(body.total ?? batch.length);
    records.push(...batch);
    if (batch.length === 0 || records.length >= total) break;
    page += 1;
  }

  return { records, total, pages: page };
}

function recordId(record) {
  return String(record.village_id ?? record.id ?? '');
}

function chunks(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}

await mkdir(rawDir, { recursive: true });
for (const manual of ['skill.md', 'knowledge.md']) {
  const text = await fetchChecked(`https://data.openfun.tw/datasets/${slug}/${manual}`, 'text');
  await save(`data/raw/openfun/${slug}/${manual}`, text);
}

const at2022 = await fetchRecords('2022-12-31', '2022-12-31');
const current = await fetchRecords('now', 'now');
const ids2022 = at2022.records.map(recordId).filter(Boolean).sort();
const idsCurrent = current.records.map(recordId).filter(Boolean).sort();
const idSet2022 = new Set(ids2022);
const idSetCurrent = new Set(idsCurrent);
const addedAfter2022 = idsCurrent.filter((id) => !idSet2022.has(id));
const absentNow = ids2022.filter((id) => !idSetCurrent.has(id));

const shapeFeatures = [];
for (const [index, batch] of chunks(ids2022, 200).entries()) {
  const params = new URLSearchParams({ ids: batch.join(',') });
  const body = await fetchChecked(`${shapesEndpoint}?${params}`);
  await save(`data/raw/openfun/${slug}/shapes-for-2022-ids-batch-${index + 1}.geojson`, body);
  if (Array.isArray(body.features)) shapeFeatures.push(...body.features);
}

const shapeIds = new Set(
  shapeFeatures
    .map((feature) => String(feature?.properties?.record_id ?? feature?.id ?? ''))
    .filter(Boolean),
);
const missingShapeIds = ids2022.filter((id) => !shapeIds.has(id));
const shapePropertyKeys = [...new Set(shapeFeatures.flatMap((feature) => Object.keys(feature?.properties ?? {})))].sort();
const versionLikeShapeProperties = shapePropertyKeys.filter((key) => /version|date|year|time|as_of/i.test(key));

const report = {
  queried_at: new Date().toISOString(),
  source: 'OpenFun / 內政部',
  dataset_slug: slug,
  records_query: {
    county_id: '63000',
    level: 'village',
    as_of_2022: '2022-12-31',
    records_2022: ids2022.length,
    api_total_2022: at2022.total,
    pages_2022: at2022.pages,
    records_now: idsCurrent.length,
    api_total_now: current.total,
    pages_now: current.pages,
    added_after_2022_ids: addedAfter2022,
    absent_now_ids: absentNow,
  },
  shapes_query: {
    endpoint_supports_as_of: false,
    requested_2022_record_ids: ids2022.length,
    returned_features: shapeFeatures.length,
    missing_record_ids: missingShapeIds,
    property_keys: shapePropertyKeys,
    version_like_property_keys: versionLikeShapeProperties,
  },
  conclusion: {
    records_are_valid_for_2022_12_31: ids2022.length > 0 && ids2022.length === at2022.total,
    geometry_verified_as_2022: false,
    reason:
      'The records API supports _as_of, but the GIS shapes endpoint has no _as_of parameter and the returned features do not independently establish a 2022 geometry vintage.',
  },
};

await save('reports/geo-version-audit.json', report);
console.log(
  JSON.stringify(
    {
      records2022: ids2022.length,
      recordsNow: idsCurrent.length,
      addedAfter2022: addedAfter2022.length,
      absentNow: absentNow.length,
      returnedShapes: shapeFeatures.length,
      missingShapes: missingShapeIds.length,
      versionLikeShapeProperties,
      geometryVerifiedAs2022: false,
    },
    null,
    2,
  ),
);
