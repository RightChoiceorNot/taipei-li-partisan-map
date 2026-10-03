export const ALL_DISTRICTS = '全部行政區';
export const ALL_VILLAGES = '全部里';
export const VILLAGE_PROMPT = '請先選擇行政區';

export type MapMode = 'partisan' | 'green-rate' | 'blue-rate' | 'flip';

export type MapSelection = {
  district: string;
  village: string;
  mode: MapMode;
};

export type MapSelectionAction =
  | { type: 'select-district'; district: string }
  | { type: 'select-village'; village: string }
  | { type: 'select-feature'; district: string; village: string }
  | { type: 'set-mode'; mode: MapMode };

export type VillageDirectoryRow = {
  district: string;
  li_name_2022: string;
  village_id?: string;
  sort_key?: string;
};

export type DistrictSummaryRow = {
  district: string;
  classification: string;
};

export type MapMetricProperties = {
  median_score: number | null;
  green_median_share: number | null;
  blue_median_share: number | null;
  classification: string;
  mapping_status: string;
  score_1994?: number | null;
  score_1998?: number | null;
  score_2002?: number | null;
  score_2006?: number | null;
  score_2010?: number | null;
  score_2014?: number | null;
  score_2022?: number | null;
};

export type FlipCamp = 'green' | 'blue';
export type FlipEvent = {
  fromYear: number;
  year: number;
  from: FlipCamp;
  to: FlipCamp;
  label: string;
};

export const SHARE_TICKS = [35, 40, 45, 50, 55, 60, 65] as const;
export const GREEN_SHARE_COLORS = ['#edf8f3', '#d7eee3', '#b5dfcd', '#82c6aa', '#4aa47f', '#237d5b', '#0d563d'] as const;
export const BLUE_SHARE_COLORS = ['#eff6fb', '#d9eaf5', '#b7d5e9', '#83b5d7', '#518fc0', '#2f6b9f', '#174a78'] as const;
export const PARTISAN_NEUTRAL_COLOR = '#d3d5d4';
export const PARTISAN_BLUE_COLORS = ['#d1e0ed', '#9eb9d5', '#638bb6', '#345f91', '#12385f'] as const;
export const PARTISAN_GREEN_COLORS = ['#cfe5da', '#99c7b3', '#5c9f85', '#2f745c', '#0d4937'] as const;
export const FLIP_GREEN_COLOR = '#2f745c';
export const FLIP_BLUE_COLOR = '#345f91';
export const FLIP_NONE_COLOR = '#d5d9d8';
export const ELECTION_YEARS = [1994, 1998, 2002, 2006, 2010, 2014, 2022] as const;
export const PARTISAN_LEGEND_SCORES = [
  -45, -35, -25, -15, -7.5,
  0,
  7.5, 15, 25, 35, 45,
];
export const PENDING_PRESENTATION = { fillColor: '#c7cdd0', className: 'pending-li' } as const;

export const INITIAL_SELECTION: MapSelection = {
  district: ALL_DISTRICTS,
  village: VILLAGE_PROMPT,
  mode: 'partisan',
};

export function selectionReducer(state: MapSelection, action: MapSelectionAction): MapSelection {
  switch (action.type) {
    case 'select-district':
      return {
        ...state,
        district: action.district,
        village: action.district === ALL_DISTRICTS ? VILLAGE_PROMPT : ALL_VILLAGES,
      };
    case 'select-village':
      return { ...state, village: action.village };
    case 'select-feature':
      return { ...state, district: action.district, village: action.village };
    case 'set-mode':
      return { ...state, mode: action.mode };
    default:
      return state;
  }
}

export function villageOptions(rows: VillageDirectoryRow[], district: string) {
  if (district === ALL_DISTRICTS) return [];
  const officialOrder = new Map<string, string>();
  for (const row of rows) {
    if (row.district !== district || !row.li_name_2022) continue;
    const key = row.sort_key ?? row.village_id ?? row.li_name_2022;
    if (!officialOrder.has(row.li_name_2022) || key < officialOrder.get(row.li_name_2022)!) {
      officialOrder.set(row.li_name_2022, key);
    }
  }
  return [...officialOrder].sort(([nameA, keyA], [nameB, keyB]) =>
    keyA.localeCompare(keyB, 'zh-Hant') || nameA.localeCompare(nameB, 'zh-Hant'),
  ).map(([name]) => name);
}

export function districtSummary(rows: DistrictSummaryRow[], district: string) {
  const scopedRows = district === ALL_DISTRICTS
    ? rows
    : rows.filter((row) => row.district === district);

  return {
    total: scopedRows.length,
    green: scopedRows.filter((row) => row.classification === '綠營優勢區').length,
    blue: scopedRows.filter((row) => row.classification === '藍營優勢區').length,
    neutral: scopedRows.filter((row) => row.classification === '中立區').length,
  };
}

export function focusTarget(selection: MapSelection) {
  if (selection.district === ALL_DISTRICTS) return { scope: 'city' as const };
  if (selection.village === ALL_VILLAGES || selection.village === VILLAGE_PROMPT) {
    return { scope: 'district' as const, district: selection.district };
  }
  return { scope: 'village' as const, district: selection.district, village: selection.village };
}

export function selectionFocusKey(selection: MapSelection) {
  return `${selection.district}\u0000${selection.village}`;
}

export function shouldBindFeatureTooltip(
  properties: Pick<VillageDirectoryRow, 'district' | 'li_name_2022'>,
  selection: MapSelection,
  selectedOnly: boolean,
) {
  return !selectedOnly || (
    properties.district === selection.district
    && properties.li_name_2022 === selection.village
  );
}

function interpolateHex(start: string, end: string, amount: number) {
  const channel = (color: string, offset: number) => Number.parseInt(color.slice(offset, offset + 2), 16);
  const mix = (offset: number) => Math.round(channel(start, offset) + (channel(end, offset) - channel(start, offset)) * amount);
  return `#${[1, 3, 5].map((offset) => mix(offset).toString(16).padStart(2, '0')).join('')}`;
}

export function shareScaleColor(value: number, mode: Extract<MapMode, 'green-rate' | 'blue-rate'>) {
  const colors = mode === 'green-rate' ? GREEN_SHARE_COLORS : BLUE_SHARE_COLORS;
  if (value <= SHARE_TICKS[0]) return colors[0];
  if (value >= SHARE_TICKS.at(-1)!) return colors.at(-1)!;
  const upperIndex = SHARE_TICKS.findIndex((tick) => value <= tick);
  const lowerTick = SHARE_TICKS[upperIndex - 1];
  const upperTick = SHARE_TICKS[upperIndex];
  return interpolateHex(colors[upperIndex - 1], colors[upperIndex], (value - lowerTick) / (upperTick - lowerTick));
}

export function partisanScaleColor(value: number) {
  const magnitude = Math.abs(value);
  if (magnitude <= 5) return PARTISAN_NEUTRAL_COLOR;
  const colors = value < 0 ? PARTISAN_BLUE_COLORS : PARTISAN_GREEN_COLORS;
  const bucket = magnitude < 10 ? 0 : magnitude < 20 ? 1 : magnitude < 30 ? 2 : magnitude < 40 ? 3 : 4;
  return colors[bucket];
}

function advantageCamp(score: number | null | undefined): FlipCamp | null {
  if (!Number.isFinite(score) || Math.abs(score!) <= 5) return null;
  return score! > 0 ? 'green' : 'blue';
}

export function flipHistory(properties: MapMetricProperties): FlipEvent[] {
  const flips: FlipEvent[] = [];
  let previous: { year: number; camp: FlipCamp } | null = null;
  for (const year of ELECTION_YEARS) {
    const camp = advantageCamp(properties[`score_${year}` as keyof MapMetricProperties] as number | null | undefined);
    if (!camp) continue;
    if (previous && previous.camp !== camp) {
      const direction = previous.camp === 'blue' ? '藍翻綠' : '綠翻藍';
      flips.push({ fromYear: previous.year, year, from: previous.camp, to: camp, label: `${previous.year}→${year} ${direction}` });
    }
    previous = { year, camp };
  }
  return flips;
}

export function featureFillPresentation(properties: MapMetricProperties | undefined, mode: MapMode) {
  const reliable = properties?.mapping_status === 'matched'
    && Number.isFinite(properties.median_score)
    && Number.isFinite(properties.green_median_share)
    && Number.isFinite(properties.blue_median_share);
  if (!reliable || !properties) return PENDING_PRESENTATION;
  if (mode === 'flip') {
    const latestFlip = flipHistory(properties).at(-1);
    if (!latestFlip) return { fillColor: FLIP_NONE_COLOR, className: '' };
    return { fillColor: latestFlip.to === 'green' ? FLIP_GREEN_COLOR : FLIP_BLUE_COLOR, className: '' };
  }
  if (mode === 'green-rate') return { fillColor: shareScaleColor(properties.green_median_share!, mode), className: '' };
  if (mode === 'blue-rate') return { fillColor: shareScaleColor(properties.blue_median_share!, mode), className: '' };
  return { fillColor: partisanScaleColor(properties.median_score!), className: '' };
}

export function featureEmphasis(
  properties: Pick<VillageDirectoryRow, 'district' | 'li_name_2022'>,
  selection: MapSelection,
) {
  const districtSelected = selection.district !== ALL_DISTRICTS;
  const villageSelected = districtSelected && selection.village !== ALL_VILLAGES && selection.village !== VILLAGE_PROMPT;
  const inDistrict = !districtSelected || properties.district === selection.district;
  const isVillage = villageSelected && inDistrict && properties.li_name_2022 === selection.village;
  return {
    inDistrict,
    isVillage,
    fillOpacity: isVillage ? 0.96 : inDistrict ? 0.84 : 0.16,
    lineWeight: isVillage ? 3.5 : 0.75,
  };
}
