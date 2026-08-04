import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

type CrowdPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  population: number;
  updatedAt: string;
  source: 'sample' | 'seoul-live' | 'skt-geovision' | 'kt';
};

const now = new Date().toISOString();
const samplePoints: CrowdPoint[] = [
  { id: 'gangnam', name: '강남역', lat: 37.4979, lng: 127.0276, population: 8300, updatedAt: now, source: 'sample' },
  { id: 'hongdae', name: '홍대입구', lat: 37.5563, lng: 126.9236, population: 6200, updatedAt: now, source: 'sample' },
  { id: 'seoul-station', name: '서울역', lat: 37.5547, lng: 126.9707, population: 4500, updatedAt: now, source: 'sample' },
  { id: 'jamsil', name: '잠실', lat: 37.5133, lng: 127.1001, population: 7100, updatedAt: now, source: 'sample' },
  { id: 'yeouido', name: '여의도', lat: 37.5219, lng: 126.9245, population: 3900, updatedAt: now, source: 'sample' },
  { id: 'gwanghwamun', name: '광화문', lat: 37.5716, lng: 126.9769, population: 2800, updatedAt: now, source: 'sample' }
];

const baseMapStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
};

function toGeoJSON(points: CrowdPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((point) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [point.lng, point.lat] },
      properties: { ...point }
    }))
  };
}

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [threshold, setThreshold] = useState(0);
  const [selected, setSelected] = useState<CrowdPoint | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const filtered = useMemo(
    () => samplePoints.filter((point) => point.population >= threshold),
    [threshold]
  );
  const total = filtered.reduce((sum, point) => sum + point.population, 0);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: baseMapStyle,
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
      map.addSource('crowd', { type: 'geojson', data: toGeoJSON(samplePoints) });

      map.addLayer({
        id: 'crowd-heat',
        type: 'heatmap',
        source: 'crowd',
        maxzoom: 16,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'population'], 0, 0, 9000, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 1.3, 14, 2.5],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 30, 14, 75],
          'heatmap-opacity': 0.75,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(44,123,182,0)',
            0.15, '#2c7bb6',
            0.35, '#00a6ca',
            0.55, '#ffff8c',
            0.75, '#fdae61',
            1, '#d7191c'
          ]
        }
      });

      map.addLayer({
        id: 'crowd-point',
        type: 'circle',
        source: 'crowd',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 10, 13, 22],
          'circle-color': ['step', ['get', 'population'], '#2c7bb6', 2500, '#00a6ca', 4500, '#ffff8c', 6500, '#fdae61', 8000, '#d7191c'],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      map.addLayer({
        id: 'crowd-label',
        type: 'symbol',
        source: 'crowd',
        layout: {
          'text-field': ['concat', ['get', 'name'], '\n', ['to-string', ['get', 'population']], '명'],
          'text-size': 12,
          'text-offset': [0, 1.8],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': '#172033',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      });

      const bounds = new maplibregl.LngLatBounds();
      samplePoints.forEach((point) => bounds.extend([point.lng, point.lat]));
      map.fitBounds(bounds, { padding: 70, maxZoom: 11.5, duration: 0 });

      map.on('click', 'crowd-point', (event) => {
        const properties = event.features?.[0]?.properties;
        if (!properties) return;
        setSelected({
          id: String(properties.id),
          name: String(properties.name),
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
    return () => {
      map.remove();
      mapRef.current = null;
    };
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
          <input type="range" min="0" max="8000" step="500" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} />
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
          <span>적음</span><i className="gradient" /><span>많음</span>
        </div>
        {selected && (
          <aside className="detail">
            <button onClick={() => setSelected(null)} aria-label="닫기">×</button>
            <h2>{selected.name}</h2>
            <p className="big">{selected.population.toLocaleString()}명</p>
            <p>데이터 소스: {selected.source}</p>
            <p>갱신: {new Date(selected.updatedAt).toLocaleTimeString('ko-KR')}</p>
          </aside>
        )}
      </section>

      <footer>현재 표시 값은 기능 확인용 샘플입니다. 실제 서비스에서는 익명·집계된 데이터만 사용해야 합니다.</footer>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');
createRoot(root).render(<App />);
