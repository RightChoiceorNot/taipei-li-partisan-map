import union from '@turf/union';
import { featureCollection } from '@turf/helpers';

export function dissolveDistrictBoundaries(villageCollection) {
  const groups = new Map();
  for (const feature of villageCollection.features ?? []) {
    const district = feature.properties?.district;
    if (!district || !feature.geometry) continue;
    if (!groups.has(district)) groups.set(district, []);
    groups.get(district).push(feature);
  }

  const features = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'zh-Hant'))
    .map(([district, villageFeatures]) => {
      const dissolved = villageFeatures.length === 1
        ? structuredClone(villageFeatures[0])
        : union(featureCollection(villageFeatures));
      if (!dissolved) throw new Error(`Unable to dissolve district boundary: ${district}`);
      return {
        ...dissolved,
        properties: { district, village_count: villageFeatures.length },
      };
    });

  return {
    type: 'FeatureCollection',
    metadata: {
      status: villageCollection.metadata?.status ?? 'complete',
      generated_at: new Date().toISOString(),
      source_geo_version: villageCollection.metadata?.source_geo_version ?? '',
      derivation: 'dissolved from village boundaries by properties.district; source village GeoJSON unchanged',
    },
    features,
  };
}
