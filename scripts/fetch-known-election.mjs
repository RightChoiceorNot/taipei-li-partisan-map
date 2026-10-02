import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiRoot = 'https://data.openfun.tw/api/v1/datasets';
const selectedDatasets = [
  'tw.gov.cec~ref~election-event',
  'tw.gov.cec~ref~candidates',
  'tw.gov.cec~txn~candidates-votes',
  'tw.gov.cec~ref~polling-station',
];
const elections = [
  { year: 1994, code: 'ELC-C1-83', targetNames: ['趙少康', '黃大洲', '陳水扁'] },
  { year: 1998, code: 'ELC-C1-87', targetNames: ['馬英九', '陳水扁'] },
  { year: 2002, code: 'ELC-C1-91', targetNames: ['馬英九', '李應元'] },
  { year: 2006, code: 'ELC-C1-95', targetNames: ['郝龍斌', '謝長廷'] },
  { year: 2010, code: 'ELC-C1-99', targetNames: ['郝龍斌', '蘇貞昌'] },
  { year: 2014, code: 'ELC-C1-103', targetNames: ['連勝文', '柯文哲'] },
  { year: 2022, code: 'ELC-C1-111', targetNames: ['蔣萬安', '陳時中'] },
];

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

async function fetchPages({ slug, params, rawPrefix }) {
  const records = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (records.length < total) {
    const query = new URLSearchParams({ ...params, page: String(page), per_page: '200' });
    const body = await fetchChecked(`${apiRoot}/${slug}/records?${query}`);
    await save(`${rawPrefix}-page-${page}.json`, body);
    const batch = Array.isArray(body.records) ? body.records : [];
    total = Number(body.total ?? batch.length);
    records.push(...batch);
    if (batch.length === 0 || records.length >= total) break;
    page += 1;
  }

  return { records, total, pages: page };
}

for (const slug of selectedDatasets) {
  for (const manual of ['skill.md', 'knowledge.md']) {
    const text = await fetchChecked(`https://data.openfun.tw/datasets/${slug}/${manual}`, 'text');
    await save(`data/raw/openfun/${slug}/${manual}`, text);
  }
}

const eventSlug = 'tw.gov.cec~ref~election-event';
const eventQuery = new URLSearchParams({ _ids: elections.map((item) => item.code).join(','), per_page: '20' });
const eventBody = await fetchChecked(`${apiRoot}/${eventSlug}/records?${eventQuery}`);
await save(`data/raw/openfun/${eventSlug}/taipei-mayor-event-codes.json`, eventBody);
const eventIds = new Set((eventBody.records ?? []).map((record) => record.vote_id));

const summary = {
  queried_at: new Date().toISOString(),
  source: 'OpenFun / 中央選舉委員會',
  keyword_searches_added: 0,
  datasets: selectedDatasets,
  elections: [],
};

for (const election of elections) {
  const electionSummary = {
    year: election.year,
    election_code: election.code,
    event_found: eventIds.has(election.code),
    candidate_query_mode: 'county-filter',
    candidate_records: 0,
    target_candidates: [],
    polling_stations: 0,
  };

  if (!electionSummary.event_found) {
    electionSummary.status = 'missing-election-event';
    summary.elections.push(electionSummary);
    continue;
  }

  const candidateSlug = 'tw.gov.cec~ref~candidates';
  let candidateResult = await fetchPages({
    slug: candidateSlug,
    params: { 選舉代碼: election.code, '選區別.縣市': '63000' },
    rawPrefix: `data/raw/openfun/${candidateSlug}/${election.year}/taipei-candidates`,
  });

  if (candidateResult.records.length === 0) {
    electionSummary.candidate_query_mode = 'event-fallback';
    candidateResult = await fetchPages({
      slug: candidateSlug,
      params: { 選舉代碼: election.code },
      rawPrefix: `data/raw/openfun/${candidateSlug}/${election.year}/all-candidates-fallback`,
    });
  }

  const taipeiCandidates = candidateResult.records.filter((record) => {
    if (electionSummary.candidate_query_mode === 'county-filter') return true;
    return /[臺台]北市/.test(String(record.選區別 ?? ''));
  });
  electionSummary.candidate_records = taipeiCandidates.length;

  const pollingSlug = 'tw.gov.cec~ref~polling-station';
  const pollingResult = await fetchPages({
    slug: pollingSlug,
    params: { 選舉代碼: election.code, 縣市代碼: '63000' },
    rawPrefix: `data/raw/openfun/${pollingSlug}/${election.year}/taipei-polling-stations`,
  });
  electionSummary.polling_stations = pollingResult.records.length;

  for (const name of election.targetNames) {
    const matches = taipeiCandidates.filter((record) => record.姓名 === name && record.副手 !== 'Y');
    if (matches.length !== 1) {
      electionSummary.target_candidates.push({ name, status: 'candidate-not-unique', matches: matches.length });
      continue;
    }

    const candidate = matches[0];
    const votesSlug = 'tw.gov.cec~txn~candidates-votes';
    const votesResult = await fetchPages({
      slug: votesSlug,
      params: { 候選人代碼: candidate.候選人代碼, 行政區層級: 'village' },
      rawPrefix: `data/raw/openfun/${votesSlug}/${election.year}/${name}-village-votes`,
    });
    electionSummary.target_candidates.push({
      name,
      candidate_code: candidate.候選人代碼,
      party: candidate.政黨,
      vote_records: votesResult.records.length,
      api_total: votesResult.total,
      pages: votesResult.pages,
      status: votesResult.records.length > 0 ? 'fetched' : 'missing-village-votes',
    });
  }

  electionSummary.status = electionSummary.target_candidates.every((candidate) => candidate.status === 'fetched')
    ? 'fetched'
    : 'partial';
  summary.elections.push(electionSummary);
}

await save('reports/election-fetch-audit.json', summary);
console.log(JSON.stringify(summary, null, 2));
