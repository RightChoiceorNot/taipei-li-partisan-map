import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateScore } from '../scripts/lib/election.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

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
  const [header, ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])));
}

const scores = parseCsv(await readFile(join(root, 'data', 'processed', 'li_election_scores.csv'), 'utf8'));
const medians = parseCsv(await readFile(join(root, 'data', 'processed', 'li_partisan_median.csv'), 'utf8'));

test('processed OpenFun data contains seven requested years and excludes 2018', () => {
  assert.deepEqual([...new Set(scores.map((row) => Number(row.year)))].sort((a, b) => a - b), [1994, 1998, 2002, 2006, 2010, 2014, 2022]);
  assert.equal(scores.some((row) => row.year === '2018'), false);
  assert.equal(scores.length, 3130);
  assert.equal(medians.length, 456);
});

test('actual 1994 Songshan Zhuangjing votes combine both blue candidates', () => {
  const row = scores.find((item) => item.year === '1994' && item.district === '松山區' && item.li_name_2022 === '莊敬里');
  assert.ok(row);
  assert.equal(Number(row.green_votes), 1569);
  assert.equal(Number(row.blue_votes), 2281);
  assert.equal(Number(row.score), Number(calculateScore(1569, 2281).toFixed(6)));
});

test('actual 2014 Songshan Zhuangjing votes apply the requested Ko vs Lien rule', () => {
  const row = scores.find((item) => item.year === '2014' && item.district === '松山區' && item.li_name_2022 === '莊敬里');
  assert.ok(row);
  assert.equal(Number(row.green_votes), 1719);
  assert.equal(Number(row.blue_votes), 1448);
  assert.equal(Number(row.score), Number(calculateScore(1719, 1448).toFixed(6)));
});

test('actual 2022 Songshan Zhuangjing votes compare only Chen and Chiang', () => {
  const row = scores.find((item) => item.year === '2022' && item.district === '松山區' && item.li_name_2022 === '莊敬里');
  assert.ok(row);
  assert.equal(Number(row.green_votes), 816);
  assert.equal(Number(row.blue_votes), 1345);
  assert.equal(Number(row.score), Number(calculateScore(816, 1345).toFixed(6)));
});

test('published medians use every reliably available election without filling missing years', () => {
  const coverage = new Map();
  for (const row of medians) {
    const available = [1994, 1998, 2002, 2006, 2010, 2014, 2022]
      .filter((year) => row[`score_${year}`] !== '' && Number.isFinite(Number(row[`score_${year}`])));
    assert.equal(available.length, Number(row.elections_count), `${row.district}${row.li_name_2022}`);
    assert.equal(row.years_included, available.join('|'));
    assert.ok([3, 5, 7].includes(available.length));
    coverage.set(available.length, (coverage.get(available.length) ?? 0) + 1);
  }
  assert.deepEqual(Object.fromEntries(coverage), { 3: 7, 5: 17, 7: 432 });
});

test('every yearly row has complementary green and blue relative shares', () => {
  for (const row of scores) {
    assert.equal(Number.isFinite(Number(row.green_share)), true);
    assert.equal(Number.isFinite(Number(row.blue_share)), true);
    assert.ok(Math.abs(Number(row.green_share) + Number(row.blue_share) - 100) <= 0.000001, `${row.year} ${row.district}${row.li_name_2022}`);
  }
});

test('every published row has complementary median shares across its available elections', () => {
  for (const row of medians) {
    assert.equal(Number.isFinite(Number(row.green_median_share)), true);
    assert.equal(Number.isFinite(Number(row.blue_median_share)), true);
    assert.ok(Math.abs(Number(row.green_median_share) + Number(row.blue_median_share) - 100) <= 0.01, `${row.district}${row.li_name_2022}`);
  }
});

test('2002 Wanhua Tangbu mapping is recovered only through documented OpenFun cross-year evidence', async () => {
  const crosswalk = parseCsv(await readFile(join(root, 'data', 'config', 'li_crosswalk.csv'), 'utf8'));
  const row = crosswalk.find((item) => item.source_year === '2002' && item.district === '萬華區' && item.li_name_source === '糖廍里');
  assert.ok(row);
  assert.equal(row.li_name_2022, '糖廍里');
  assert.equal(row.mapping_type, 'manual-cross-year-openfun-evidence');
  assert.match(row.source_evidence, /2006.*63000070-015/);
});

test('published 2022 li directory contains all 456 villages across 12 districts', async () => {
  const directory = JSON.parse(await readFile(join(root, 'public', 'data', 'li_directory_2022.json'), 'utf8'));
  assert.equal(directory.rows.length, 456);
  assert.equal(new Set(directory.rows.map((row) => row.district)).size, 12);
  assert.equal(new Set(directory.rows.map((row) => `${row.district}\u0000${row.li_name_2022}`)).size, 456);
});

test('published map payload declares and exposes both median share fields', async () => {
  const scoresPayload = JSON.parse(await readFile(join(root, 'public', 'data', 'li_partisan_scores.json'), 'utf8'));
  const geojson = JSON.parse(await readFile(join(root, 'public', 'data', 'taipei_li_partisan.geojson'), 'utf8'));
  assert.ok(scoresPayload.rows.every((row) => Number.isFinite(row.green_median_share) && Number.isFinite(row.blue_median_share)));
  assert.deepEqual(geojson.metadata.property_schema, ['median_score', 'green_median_share', 'blue_median_share', 'classification', 'elections_count', 'calculation_basis']);
  for (const feature of geojson.features) {
    assert.equal(Object.hasOwn(feature.properties, 'green_median_share'), true);
    assert.equal(Object.hasOwn(feature.properties, 'blue_median_share'), true);
  }
});

test('published map contains all 456 OpenFun village shapes and 12 dissolved district boundaries', async () => {
  const geojson = JSON.parse(await readFile(join(root, 'public', 'data', 'taipei_li_partisan.geojson'), 'utf8'));
  const districts = JSON.parse(await readFile(join(root, 'public', 'data', 'taipei_district_boundaries.geojson'), 'utf8'));
  assert.equal(geojson.features.length, 456);
  assert.equal(districts.features.length, 12);
  assert.equal(geojson.features.filter((feature) => feature.properties.mapping_status === 'matched').length, 456);
  assert.equal(geojson.features.filter((feature) => feature.properties.elections_count < 7).length, 24);
  assert.equal(new Set(geojson.features.map((feature) => `${feature.properties.district}\u0000${feature.properties.li_name_2022}`)).size, 456);
});

test('provisional OpenFun geometry is displayed with an explicit version notice', async () => {
  const geojson = JSON.parse(await readFile(join(root, 'public', 'data', 'taipei_li_partisan.geojson'), 'utf8'));
  assert.equal(geojson.metadata.status, 'provisional-boundary');
  assert.equal(geojson.metadata.geometry_version_verified, false);
  assert.match(geojson.metadata.notice, /未提供幾何版本|不可視為已獨立驗證/);
  assert.equal(Object.hasOwn(geojson.metadata, 'blocker'), false);
});
