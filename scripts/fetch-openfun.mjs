import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'data', 'raw', 'openfun');
const manifest = JSON.parse(await readFile(join(root, 'data', 'config', 'openfun-manifest.json'), 'utf8'));
const SEARCHES = [
  { key: 'candidate-votes', query: '候選人得票 台北市長' },
  { key: 'geo-villages', query: '行政區 地圖 里界' },
];

await mkdir(rawDir, { recursive: true });

async function requestJson(url, token, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function obtainToken() {
  if (process.env.OPENFUN_TOKEN) return process.env.OPENFUN_TOKEN;
  const { response, body } = await requestJson('https://data.openfun.tw/api/v1/auth/device', null, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_name: 'taipei-li-partisan-map', client: 'codex' }),
  });
  if (!response.ok || !body.device_code) throw new Error(`Device authorization failed (${response.status}).`);
  console.log(`請開啟授權連結：${body.verification_uri_complete}`);
  const deadline = Date.now() + Number(body.expires_in ?? 1800) * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const tokenResult = await requestJson('https://data.openfun.tw/api/v1/auth/token', null, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'device_code', device_code: body.device_code }),
    });
    if (tokenResult.body.access_token) return tokenResult.body.access_token;
    if (!['authorization_pending', 'slow_down'].includes(tokenResult.body.error)) {
      throw new Error(`Device authorization stopped: ${tokenResult.body.error ?? tokenResult.response.status}`);
    }
  }
  throw new Error('Device authorization expired.');
}

async function saveJson(relativePath, value) {
  const destination = join(root, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const token = await obtainToken();
for (const search of SEARCHES) {
  const url = `https://data.openfun.tw/api/v1/search?q=${encodeURIComponent(search.query)}`;
  const { response, body } = await requestJson(url, token);
  if (!response.ok) throw new Error(`Search failed for ${search.query} (${response.status}).`);
  await saveJson(`data/raw/openfun/search-${search.key}.json`, body);
  console.log(`${search.query}: ${body.datasets?.total ?? 0} 個資料集`);
}

const slugs = new Set([
  ...(manifest.election_datasets ?? []).map((item) => item.slug),
  ...(manifest.geo_dataset?.slug ? [manifest.geo_dataset.slug] : []),
]);

for (const slug of slugs) {
  for (const manual of ['skill.md', 'knowledge.md']) {
    const url = `https://data.openfun.tw/datasets/${slug}/${manual}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      if (manual === 'knowledge.md' && response.status === 404) continue;
      throw new Error(`Cannot read ${slug}/${manual} (${response.status}).`);
    }
    const text = await response.text();
    const destination = join(rawDir, slug, manual);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, text, 'utf8');
  }
}

for (const dataset of manifest.election_datasets ?? []) {
  if (!dataset.schema_verified || !Array.isArray(dataset.queries)) {
    console.log(`跳過 ${dataset.slug}：schema 或查詢尚未驗證。`);
    continue;
  }
  for (const query of dataset.queries) {
    let page = 1;
    let total = Infinity;
    while ((page - 1) * query.per_page < total) {
      const params = new URLSearchParams({ ...query.params, page: String(page), per_page: String(query.per_page) });
      const url = `https://data.openfun.tw/api/v1/datasets/${dataset.slug}/records?${params}`;
      const { response, body } = await requestJson(url, token);
      if (!response.ok) throw new Error(`Records fetch failed for ${dataset.slug} (${response.status}).`);
      total = Number(body.total ?? body.records?.length ?? 0);
      await saveJson(`data/raw/openfun/${dataset.slug}/${query.year}/page-${page}.json`, body);
      page += 1;
    }
  }
}

console.log('資料擷取完成；Token 僅保留在本次程式記憶體中。');
