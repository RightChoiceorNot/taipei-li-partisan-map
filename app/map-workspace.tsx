'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeoJSON as LeafletGeoJSON, Layer, LayerGroup, Map as LeafletMap } from 'leaflet';
import { AlertTriangle, Database, Info, MapPinned, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  ALL_DISTRICTS,
  ALL_VILLAGES,
  districtSummary,
  featureEmphasis,
  featureFillPresentation,
  focusTarget,
  GREEN_SHARE_COLORS,
  INITIAL_SELECTION,
  PARTISAN_LEGEND_SCORES,
  partisanScaleColor,
  selectionFocusKey,
  selectionReducer,
  SHARE_TICKS,
  type MapMode,
  type VillageDirectoryRow,
  VILLAGE_PROMPT,
  villageOptions,
  BLUE_SHARE_COLORS,
} from '../lib/map-model';

type Classification = '綠營優勢區' | '中立區' | '藍營優勢區' | '待確認';
type LiProperties = VillageDirectoryRow & {
  median_score: number | null;
  green_median_share: number | null;
  blue_median_share: number | null;
  classification: Classification;
  mapping_status: string;
  source_geo_dataset: string;
  source_geo_version: string;
  elections_count: number;
  years_included: string;
  calculation_basis: 'seven-election-median' | 'available-election-median' | 'unavailable';
  score_1994?: number | null;
  score_1998?: number | null;
  score_2002?: number | null;
  score_2006?: number | null;
  score_2010?: number | null;
  score_2014?: number | null;
  score_2022?: number | null;
};
type LiFeature = Feature<Geometry, LiProperties>;
type LiCollection = FeatureCollection<Geometry, LiProperties> & {
  metadata?: { status?: string; blocker?: string; notice?: string; generated_at?: string; score_summary_count?: number; seven_election_count?: number };
};
type DistrictCollection = FeatureCollection<Geometry, { district: string; village_count?: number }>;
type ScoreCollection = { metadata?: { count?: number }; rows: LiProperties[] };
type DirectoryCollection = { metadata?: { count?: number }; rows: VillageDirectoryRow[] };

const YEAR_RULES = [
  ['1994', '陳水扁 vs. 趙少康＋黃大洲'],
  ['1998', '陳水扁 vs. 馬英九'],
  ['2002', '李應元 vs. 馬英九'],
  ['2006', '謝長廷 vs. 郝龍斌'],
  ['2010', '蘇貞昌 vs. 郝龍斌'],
  ['2014', '柯文哲 vs. 連勝文'],
  ['2022', '陳時中 vs. 蔣萬安'],
] as const;

const CLASS_COLORS: Record<Classification, string> = {
  '綠營優勢區': '#19815f',
  '中立區': '#d3d5d4',
  '藍營優勢區': '#386fa7',
  '待確認': '#d59b38',
};

const MODES: { value: MapMode; label: string }[] = [
  { value: 'partisan', label: '藍綠優勢分布' },
  { value: 'green-rate', label: '綠營相對得票率' },
  { value: 'blue-rate', label: '藍營相對得票率' },
];

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '尚無可靠資料';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '尚無可靠資料';
  return `${value.toFixed(1)}%`;
}

function tooltipContent(properties: LiProperties) {
  const yearScores = YEAR_RULES.map(([year]) => `<div><span>${year}</span><b>${formatScore(properties[`score_${year}` as keyof LiProperties] as number | null)}</b></div>`).join('');
  const coverage = properties.elections_count === 7
    ? '七屆完整中位數'
    : `${properties.elections_count} 屆可用資料中位數（${properties.years_included.replaceAll('|', '、')}）`;
  return `<div class="li-tooltip"><p>${properties.district}</p><h3>${properties.li_name_2022}</h3><small class="tooltip-coverage">${coverage}</small><dl><dt>藍綠差距中位數</dt><dd>${formatScore(properties.median_score)}</dd><dt>綠營相對得票率中位數</dt><dd>${formatPercent(properties.green_median_share)}</dd><dt>藍營相對得票率中位數</dt><dd>${formatPercent(properties.blue_median_share)}</dd><dt>分類</dt><dd>${properties.classification}</dd></dl><div class="tooltip-years">${yearScores}</div>${properties.mapping_status !== 'matched' ? `<strong class="tooltip-warning">里界對應警示：${properties.mapping_status}</strong>` : ''}</div>`;
}

function installPendingPattern(map: LeafletMap) {
  const svg = map.getPane('villagePane')?.querySelector('svg');
  if (!svg || svg.querySelector('#pending-li-pattern')) return;
  const namespace = 'http://www.w3.org/2000/svg';
  const defs = document.createElementNS(namespace, 'defs');
  const pattern = document.createElementNS(namespace, 'pattern');
  pattern.setAttribute('id', 'pending-li-pattern');
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  pattern.setAttribute('width', '8');
  pattern.setAttribute('height', '8');
  const background = document.createElementNS(namespace, 'rect');
  background.setAttribute('width', '8');
  background.setAttribute('height', '8');
  background.setAttribute('fill', '#d8dde0');
  const stripe = document.createElementNS(namespace, 'path');
  stripe.setAttribute('d', 'M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6');
  stripe.setAttribute('stroke', '#9ca8ad');
  stripe.setAttribute('stroke-width', '2');
  pattern.appendChild(background);
  pattern.appendChild(stripe);
  defs.appendChild(pattern);
  svg.insertBefore(defs, svg.firstChild);
}

export function MapWorkspace() {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const villageLayerRef = useRef<LeafletGeoJSON | null>(null);
  const districtLayersRef = useRef<Layer[]>([]);
  const districtLabelsRef = useRef<LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [data, setData] = useState<LiCollection | null>(null);
  const [districtData, setDistrictData] = useState<DistrictCollection | null>(null);
  const [scoreRows, setScoreRows] = useState<LiProperties[]>([]);
  const [directory, setDirectory] = useState<VillageDirectoryRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(false);
  const [selection, dispatch] = useReducer(selectionReducer, INITIAL_SELECTION);
  const selectedDistrict = selection.district;
  const selectedVillage = selection.village;
  const mapFocusKey = selectionFocusKey(selection);

  useEffect(() => {
    const dataUrl = (filename: string) => `${import.meta.env.BASE_URL}data/${filename}`;
    Promise.all([
      fetch(dataUrl('taipei_li_partisan.geojson')).then((response) => {
        if (!response.ok) throw new Error(`GeoJSON HTTP ${response.status}`);
        return response.json() as Promise<LiCollection>;
      }),
      fetch(dataUrl('taipei_district_boundaries.geojson')).then((response) => {
        if (!response.ok) throw new Error(`District GeoJSON HTTP ${response.status}`);
        return response.json() as Promise<DistrictCollection>;
      }),
      fetch(dataUrl('li_partisan_scores.json')).then((response) => {
        if (!response.ok) throw new Error(`Scores HTTP ${response.status}`);
        return response.json() as Promise<ScoreCollection>;
      }),
      fetch(dataUrl('li_directory_2022.json')).then((response) => {
        if (!response.ok) throw new Error(`Li directory HTTP ${response.status}`);
        return response.json() as Promise<DirectoryCollection>;
      }),
    ])
      .then(([geojson, districts, scores, liDirectory]) => {
        setData(geojson);
        setDistrictData(districts);
        setScoreRows(scores.rows);
        setDirectory(liDirectory.rows);
      })
      .catch(() => setLoadError('無法讀取本機地圖資料，請先執行 npm run data:normalize-election 與 npm run data:build。'));
  }, []);

  const districts = useMemo(() => [
    ALL_DISTRICTS,
    ...Array.from(new Set(directory.map((row) => row.district))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-Hant')),
  ], [directory]);
  const villages = useMemo(() => villageOptions(directory, selection.district), [directory, selection.district]);
  const filteredScores = useMemo(() => scoreRows.filter((row) =>
    (selection.district === ALL_DISTRICTS || row.district === selection.district)
    && (selection.village === VILLAGE_PROMPT || selection.village === ALL_VILLAGES || row.li_name_2022 === selection.village),
  ), [scoreRows, selection.district, selection.village]);
  const currentDistrictSummary = useMemo(
    () => districtSummary(scoreRows, selection.district),
    [scoreRows, selection.district],
  );
  const selected = useMemo(() => scoreRows.find((row) =>
    row.district === selection.district && row.li_name_2022 === selection.village,
  ) ?? data?.features.find((feature) =>
    feature.properties.district === selection.district && feature.properties.li_name_2022 === selection.village,
  )?.properties ?? null, [data, scoreRows, selection.district, selection.village]);

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !mapNode.current) return;
      const map = L.map(mapNode.current, {
        center: [25.055, 121.55], zoom: 12, minZoom: 10, maxZoom: 17,
        zoomSnap: 0.25, zoomDelta: 0.25,
        zoomControl: false, attributionControl: false,
      });
      for (const [name, zIndex] of [['villagePane', 410], ['districtHaloPane', 430], ['districtLinePane', 440], ['districtLabelPane', 450]] as const) {
        const pane = map.createPane(name);
        pane.style.zIndex = String(zIndex);
        if (name !== 'villagePane') pane.style.pointerEvents = 'none';
      }
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !data) return;
    let disposed = false;
    void import('leaflet').then((L) => {
      const map = mapRef.current;
      if (disposed || !map) return;
      villageLayerRef.current?.remove();
      const layer = L.geoJSON(data as FeatureCollection, {
        pane: 'villagePane',
        style: (feature) => {
          const properties = feature?.properties as LiProperties | undefined;
          const emphasis = properties ? featureEmphasis(properties, selection) : { fillOpacity: 0.84, lineWeight: 0.75, isVillage: false };
          const presentation = featureFillPresentation(properties, selection.mode);
          return {
            pane: 'villagePane',
            color: emphasis.isVillage ? '#f2a51a' : '#f8fafc',
            weight: emphasis.lineWeight,
            opacity: emphasis.isVillage ? 1 : 0.72,
            fillColor: presentation.fillColor,
            fillOpacity: emphasis.fillOpacity,
            className: presentation.className,
          };
        },
        onEachFeature: (feature, featureLayer) => {
          const properties = (feature as LiFeature).properties;
          featureLayer.bindTooltip(tooltipContent(properties), { direction: 'top', opacity: 0.97, sticky: true, className: 'li-data-tooltip' });
          featureLayer.on('mouseover', () => {
            layer.eachLayer((otherLayer: Layer & { closeTooltip?: () => void }) => {
              if (otherLayer !== featureLayer) otherLayer.closeTooltip?.();
            });
          });
          featureLayer.on('click', () => dispatch({ type: 'select-feature', district: properties.district, village: properties.li_name_2022 }));
        },
      }).addTo(map);
      installPendingPattern(map);
      villageLayerRef.current = layer;
      layer.eachLayer((child: Layer & { feature?: LiFeature; openTooltip?: () => void }) => {
        if (child.feature?.properties.district === selection.district && child.feature.properties.li_name_2022 === selection.village) child.openTooltip?.();
      });
    });
    return () => { disposed = true; };
  }, [data, mapReady, selection]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !districtData) return;
    let disposed = false;
    let syncLabels: (() => void) | null = null;
    void import('leaflet').then((L) => {
      const map = mapRef.current;
      if (disposed || !map) return;
      for (const layer of districtLayersRef.current) layer.remove();
      districtLabelsRef.current?.remove();
      const halo = L.geoJSON(districtData as FeatureCollection, {
        pane: 'districtHaloPane', interactive: false,
        style: { pane: 'districtHaloPane', color: '#ffffff', weight: 7, opacity: 0.76, fill: false },
      }).addTo(map);
      const line = L.geoJSON(districtData as FeatureCollection, {
        pane: 'districtLinePane', interactive: false,
        style: { pane: 'districtLinePane', color: '#263e50', weight: 2.8, opacity: 0.98, fill: false },
      }).addTo(map);
      const labels = L.layerGroup();
      for (const feature of districtData.features) {
        const bounds = L.geoJSON(feature).getBounds();
        if (!bounds.isValid()) continue;
        L.marker(bounds.getCenter(), {
          pane: 'districtLabelPane', interactive: false,
          icon: L.divIcon({ className: 'district-label', html: `<span>${feature.properties.district}</span>`, iconSize: [72, 28], iconAnchor: [36, 14] }),
        }).addTo(labels);
      }
      districtLayersRef.current = [halo, line];
      districtLabelsRef.current = labels;
      syncLabels = () => {
        if (map.getZoom() >= 13) {
          if (!map.hasLayer(labels)) labels.addTo(map);
        } else if (map.hasLayer(labels)) labels.remove();
      };
      map.on('zoomend', syncLabels);
      syncLabels();
    });
    return () => {
      disposed = true;
      if (syncLabels && mapRef.current) mapRef.current.off('zoomend', syncLabels);
    };
  }, [districtData, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !data?.features.length) return;
    let disposed = false;
    void import('leaflet').then((L) => {
      const map = mapRef.current;
      if (disposed || !map) return;
      const target = focusTarget({ district: selectedDistrict, village: selectedVillage, mode: 'partisan' });
      const features = data.features.filter((feature) => {
        if (target.scope === 'city') return true;
        if (feature.properties.district !== target.district) return false;
        return target.scope === 'district' || feature.properties.li_name_2022 === target.village;
      });
      const bounds = L.geoJSON({ type: 'FeatureCollection', features } as FeatureCollection).getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: target.scope === 'village' ? [70, 70] : [28, 28], maxZoom: target.scope === 'village' ? 16 : 14 });
    });
    return () => { disposed = true; };
  }, [data, mapReady, mapFocusKey, selectedDistrict, selectedVillage]);

  const blocker = loadError ?? data?.metadata?.blocker;
  const scoreSummaryCount = data?.metadata?.score_summary_count ?? scoreRows.length;
  const sevenElectionCount = data?.metadata?.seven_election_count ?? scoreRows.filter((row) => row.elections_count === 7).length;
  const chosenDirectoryRow = directory.find((row) => row.district === selection.district && row.li_name_2022 === selection.village);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true"><MapPinned size={20} /></div>
        <div><p className="eyebrow">公民資料工具 · 臺北市</p><h1>各里藍綠相對支持度地圖</h1></div>
        <div className="data-status" aria-label="資料狀態"><span className="status-dot" />{scoreSummaryCount ? `${scoreSummaryCount} 里皆有資料 · ${sevenElectionCount} 里七屆完整` : '來源驗證中'}</div>
      </header>

      <section className="workspace">
        <aside className="control-panel" aria-label="地圖篩選與說明">
          <div className="panel-section coverage-card">
            <p>{selection.district === ALL_DISTRICTS ? '臺北市里數' : `${selection.district}里數`}</p>
            <div className="coverage-total"><strong>{currentDistrictSummary.total}</strong><span>里</span></div>
            <div className="advantage-counts" aria-label="藍綠優勢里數">
              <span className="green-count"><i aria-hidden="true" />綠營優勢 <b>{currentDistrictSummary.green}</b></span>
              <span className="blue-count"><i aria-hidden="true" />藍營優勢 <b>{currentDistrictSummary.blue}</b></span>
            </div>
          </div>
          <div className="panel-section controls">
            <div className="control-heading"><p>探索地圖</p><span>選擇行政區與里別</span></div>
            <label htmlFor="district-filter">行政區</label>
            <Select value={selection.district} onValueChange={(value) => dispatch({ type: 'select-district', district: value ?? ALL_DISTRICTS })}>
              <SelectTrigger id="district-filter" className="filter-control"><SelectValue /></SelectTrigger>
              <SelectContent>{districts.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
            </Select>
            <label htmlFor="village-filter">里別</label>
            <Select disabled={selection.district === ALL_DISTRICTS} value={selection.village} onValueChange={(value) => dispatch({ type: 'select-village', village: value ?? ALL_VILLAGES })}>
              <SelectTrigger id="village-filter" className="filter-control"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ALL_VILLAGES}>{ALL_VILLAGES}</SelectItem>{villages.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="panel-section methodology-note">
            <p>432 里取七屆中位數；23 個後期新增里與 1 個合併改設里，僅取 3 或 5 屆實際票數中位數。</p>
            <p className="methodology-rule">1994 年合併趙少康與黃大洲；2014 年將柯文哲列為綠營；2018 年特殊選情整屆排除；2022 年僅比較陳時中與蔣萬安。</p>
          </div>
          <div className="panel-section source-note"><Database size={17} aria-hidden="true" /><p>資料入口<br /><a href="https://data.openfun.tw" target="_blank" rel="noreferrer">歐噴資料庫 OpenFun</a></p></div>
        </aside>

        <div className="map-stage">
          <div ref={mapNode} className="map-canvas" aria-label="臺北市里別藍綠相對支持度地圖" />
          <div className="map-grid" aria-hidden="true" />
          <fieldset className="mode-fieldset map-toolbar">
            <legend>地圖模式</legend>
            <div className="mode-switch">
              {MODES.map((mode) => <button key={mode.value} type="button" aria-pressed={selection.mode === mode.value} onClick={() => dispatch({ type: 'set-mode', mode: mode.value })}>{mode.label}</button>)}
            </div>
          </fieldset>
          {blocker && <Alert className="map-alert"><AlertTriangle /><AlertTitle>地圖資料無法載入</AlertTitle><AlertDescription>{blocker}</AlertDescription></Alert>}
          <section className="map-legend" aria-label="地圖圖例">
            <h2>{selection.mode === 'partisan' ? '藍綠優勢分布' : selection.mode === 'green-rate' ? '綠營相對得票率中位數' : '藍營相對得票率中位數'}</h2>
            {selection.mode === 'partisan' ? <div className="partisan-legend">
              <p className="legend-description">每格 10 個百分點；負值為藍營領先，正值為綠營領先。</p>
              <div className="partisan-ramp" aria-label="藍綠差距每 10 個百分點色階">
                {PARTISAN_LEGEND_SCORES.map((score) => <span key={score} style={{ background: partisanScaleColor(score) }} />)}
              </div>
              <div className="partisan-ticks"><span>≤−50</span><span>−25</span><span>0</span><span>+25</span><span>≥+50</span></div>
              <div className="partisan-sides"><span>藍營領先</span><span>綠營領先</span></div>
            </div> : <div className="rate-legend">
              <p className="legend-description">{selection.mode === 'green-rate' ? '綠營票數占藍綠兩方票數的可用屆次中位數。' : '藍營票數占藍綠兩方票數的可用屆次中位數。'}</p>
              <div className="rate-ramp" style={{ background: `linear-gradient(90deg, ${(selection.mode === 'green-rate' ? GREEN_SHARE_COLORS : BLUE_SHARE_COLORS).join(', ')})` }} />
              <div className="rate-ticks">{SHARE_TICKS.map((tick, index) => <span key={tick}>{index === 0 ? '≤35' : index === SHARE_TICKS.length - 1 ? '≥65' : `${tick}`}</span>)}</div>
            </div>}
            <div className="boundary-key"><p><span className="li-line" />里界</p><p><span className="district-line" />行政區界</p></div>
          </section>
          <aside className={`detail-panel ${selected || chosenDirectoryRow ? 'has-selection' : 'is-browser'} ${isDetailCollapsed ? 'is-collapsed' : ''}`} aria-label="里別詳細資料">
            <button
              className="detail-toggle"
              type="button"
              aria-expanded={!isDetailCollapsed}
              aria-controls="detail-panel-content"
              onClick={() => setIsDetailCollapsed((collapsed) => !collapsed)}
            >
              {isDetailCollapsed ? <PanelRightOpen size={16} aria-hidden="true" /> : <PanelRightClose size={16} aria-hidden="true" />}
              <span>{isDetailCollapsed ? '展開里別資料' : '收合'}</span>
            </button>
            <div id="detail-panel-content" className="detail-content" hidden={isDetailCollapsed}>
              {selected ? <>
              <button className="back-to-list" type="button" onClick={() => dispatch({ type: 'select-village', village: ALL_VILLAGES })}>返回本區全部里</button>
              <div className="detail-heading"><p>{selected.district}</p><h2>{selected.li_name_2022}</h2><span style={{ color: CLASS_COLORS[selected.classification] }}>{selected.classification}</span></div>
              <div className="median-card"><div><span>{selected.elections_count === 7 ? '七屆差距中位數' : `${selected.elections_count} 屆可用資料差距中位數`}</span><strong>{formatScore(selected.median_score)}</strong><small>百分點</small></div><dl><div><dt>綠營相對得票率中位數</dt><dd>{formatPercent(selected.green_median_share)}</dd></div><div><dt>藍營相對得票率中位數</dt><dd>{formatPercent(selected.blue_median_share)}</dd></div></dl></div>
              <div className="year-list">{YEAR_RULES.map(([year, rule]) => <div key={year}><span>{year}</span><strong>{formatScore(selected[`score_${year}` as keyof LiProperties] as number | null)}</strong><small>{rule}</small></div>)}</div>
              {selected.elections_count < 7 && <Alert className="coverage-warning"><Info /><AlertTitle>資料涵蓋 {selected.elections_count} 屆</AlertTitle><AlertDescription>此里在早期選舉沒有可直接對應的現行里別票數，只採用 {selected.years_included.replaceAll('|', '、')} 年實際得票計算；未將舊里票數拆分、複製或估算。</AlertDescription></Alert>}
              {selected.mapping_status !== 'matched' && <Alert className="mapping-warning"><AlertTriangle /><AlertTitle>里界對應需確認</AlertTitle><AlertDescription>{selected.mapping_status}</AlertDescription></Alert>}
            </> : chosenDirectoryRow ? <div className="empty-detail"><Info size={22} /><h2>{chosenDirectoryRow.li_name_2022}</h2><p>此里尚無完整七屆計分資料；選取與地圖高亮仍會保留。</p></div> : filteredScores.length ? <div className="score-browser">
              <div className="score-browser-heading"><Info size={20} /><div><h2>已計分里</h2><p>選擇行政區與里別可縮放、高亮並開啟資料卡。</p></div></div>
              <div className="score-result-list">{filteredScores.slice(0, 40).map((row) => <button key={`${row.district}-${row.li_name_2022}`} type="button" onClick={() => dispatch({ type: 'select-feature', district: row.district, village: row.li_name_2022 })}><span>{row.district}</span><strong>{row.li_name_2022}</strong><em style={{ color: CLASS_COLORS[row.classification] }}>{formatScore(row.median_score)}</em></button>)}</div>
              {filteredScores.length > 40 && <p className="result-note">目前顯示前 40 筆，請用行政區與里別縮小範圍。</p>}
              </div> : <div className="empty-detail"><Info size={22} /><h2>沒有符合條件的里</h2><p>請改選行政區或里別。</p></div>}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
