import test from 'node:test';
import assert from 'node:assert/strict';
import { dissolveDistrictBoundaries } from '../scripts/lib/district-boundaries.mjs';

function square(district, west, east) {
  return {
    type: 'Feature',
    properties: { district, li_name_2022: `${west}里` },
    geometry: { type: 'Polygon', coordinates: [[[west, 0], [east, 0], [east, 1], [west, 1], [west, 0]]] },
  };
}

test('里界可依 district dissolve 為獨立行政區外框，且不修改來源', () => {
  const villages = {
    type: 'FeatureCollection',
    metadata: { status: 'complete', source_geo_version: '2022-verified' },
    features: [square('甲區', 0, 1), square('甲區', 1, 2), square('乙區', 3, 4)],
  };
  const original = structuredClone(villages);
  const result = dissolveDistrictBoundaries(villages);
  assert.equal(result.features.length, 2);
  assert.equal(result.features.find((feature) => feature.properties.district === '甲區').properties.village_count, 2);
  assert.match(result.metadata.derivation, /source village GeoJSON unchanged/);
  assert.deepEqual(villages, original);
});
