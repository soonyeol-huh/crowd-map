import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

type CrowdPoint = {
  id: string;
  lat: number;
  lng: number;
  population: number;
  updatedAt: string;
  source: 'sample' | 'seoul-live' | 'skt-geovision' | 'kt';
};

const samplePoints: CrowdPoint[] = [
  { id: 'gangnam', lat: 37.4979, lng: 127.0276, population: 8300, updatedAt: new Date().toISOString(), source: 'sample' },
  { id: 'hongdae', lat: 37.5563, lng: 126.9236, population: 6200, updatedAt: new Date().toISOString(), source: 'sample' },
  { id: 'seoul-station', lat: 37.5547, lng: 126.9707, population: 4500, updatedAt: new Date().toISOString(), source: 'sample' },
  { id: 'jamsil', lat: 37.5133, lng: 127.1001, population: 7100, updatedAt: new Date().toISOString(), source: 'sample' },
  { id: 'yeouido', lat: 37.5219, lng: 126.9245, population: 3900, updatedAt: new Date().toISOString(), source: 'sample' },
  { id: 'gwanghwamun', lat: 37.5716, lng: 126.9769, population: 2800, updatedAt: new Date().toISOString(), source: 'sample' }
];

function toGeoJSON(points: CrowdPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { ...p }
    }))
  };
}

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [points] = useState(samplePoints);
  const [threshold, setThreshold] = useState(0);
  const [selected, setSelected] = useState<CrowdPoint | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const filtered = useMemo(() => points.filter((p) => p.population >= threshold), [points, threshold]);
  const total = filtered.reduce((sum, p) => sum + p.population, 0);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://demotiles.maplibre.org/style.json',
        center: [126.985, 37.54],
        zoom: 10.5
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.on('error', (event) => {
        console.error('MapLibre error', event.error);
        setMapError(event.error?.message ?? '지도 데이터를 불러오지 못했습니다.');
      });

      map.on('load', () => {
        setMapError(null);
        map.addSource('crowd', { type: 'geojson', data: toGeoJSON(filtered) });
        map.addLayer({
          id: 'crowd-heat',
          type: 'heatmap',
          source: 'crowd',
          maxzoom: 15,
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'population'], 0, 0, 9000, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 15, 2.2],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 20, 15, 55],
            'heatmap-opacity': 0.85,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(33,102,172,0)',
              0.2, '#2c7bb6',
              0.4, '#00a6ca',
              0.6, '#ffff8c',
              0.8, '#fdae61',
              1, '#d7191c'
            ]
          }
        });
        map.addLayer({
          id: 'crowd-point',
          type: 'circle',
          source: 'crowd',
          minzoom: 12,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'population'], 0, 6, 9000, 18],
            'circle-color': ['step', ['get', 'population'], '#2c7bb6', 2500, '#00a6ca', 4500, '#ffff8c', 6500, '#fdae61', 8000, '#d7191c'],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
          }
        });

        map.on('click', 'crowd-point', (event) => {
          const properties = event.features?.[0]?.properties;
          if (!properties) return;
          setSelected({
            id: String(properties.id),
            lat: Number(properties.lat),
            lng: Number(properties.lng),
            population: Number(properties.population),
            updatedAt: String(properties.updatedAt),
            source: properties.source
          });
        });
        map.on('mouseenter', 'crowd-point', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'crowd-point', () => { map.getCanvas().style.cursor = ''; });
      });

      mapRef.current = map;
      return () => { map.remove(); mapRef.current = null; };
    } catch (error) {
      console.error(error);
      setMapError(error instanceof Error ? error.message : '지도 초기화에 실패했습니다.');
    }
  }, []);

  useEffect(() => {
    const source = mapRef.current?.getSource('crowd') as maplibregl.GeoJSONSource | undefined;
    source?.setData(toGeoJSON(filtered));
  }, [filtered]);

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>실시간 혼잡도 지도</h1>
          <p>통신·공공 유동인구 데이터를 격자 단위로 시각화</p>
        </div>
        <span className="status">● 샘플 데이터</span>
      </header>

      <section className="controls">
        <label>
          최소 표시 인구: <strong>{threshold.toLocaleString()}명</strong>
          <input type="range" min="0" max="8000" step="500" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
        </label>
        <div className="metrics">
          <span>표시 지역 <strong>{filtered.length}</strong></span>
          <span>추정 인구 합계 <strong>{total.toLocaleString()}명</strong></span>
        </div>
      </section>

      <section className="map-wrap">
        <div ref={mapContainer} className="map" />
        {mapError && <div className="map-error">지도 오류: {mapError}</div>}
        <div className="legend" aria-label="혼잡도 범례">
          <span>적음</span><i className="gradient"/><span>많음</span>
        </div>
        {selected && (
          <aside className="detail">
            <button onClick={() => setSelected(null)} aria-label="닫기">×</button>
            <h2>{selected.id}</h2>
            <p className="big">{selected.population.toLocaleString()}명</p>
            <p>데이터 소스: {selected.source}</p>
            <p>갱신: {new Date(selected.updatedAt).toLocaleTimeString('ko-KR')}</p>
          </aside>
        )}
      </section>

      <footer>개인을 추적하지 않으며, 최소 격자·집계 기준을 적용해야 합니다.</footer>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');
createRoot(root).render(<App />);
