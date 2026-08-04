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

function markerColor(population: number) {
  if (population >= 8000) return '#d7191c';
  if (population >= 6500) return '#f57c00';
  if (population >= 4500) return '#fbc02d';
  if (population >= 2500) return '#00a6ca';
  return '#2c7bb6';
}

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [threshold, setThreshold] = useState(0);
  const [selected, setSelected] = useState<CrowdPoint | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const filtered = useMemo(
    () => samplePoints.filter((point) => point.population >= threshold),
    [threshold]
  );
  const total = filtered.reduce((sum, point) => sum + point.population, 0);

  const focusSeoul = () => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = new maplibregl.LngLatBounds();
    samplePoints.forEach((point) => bounds.extend([point.lng, point.lat]));
    map.fitBounds(bounds, { padding: 80, maxZoom: 11.5, duration: 500 });
  };

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: baseMapStyle,
      center: [126.985, 37.54],
      zoom: 10.5
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
      const bounds = new maplibregl.LngLatBounds();
      samplePoints.forEach((point) => bounds.extend([point.lng, point.lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 11.5, duration: 0 });
    });

    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    filtered.forEach((point) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'crowd-marker';
      el.style.setProperty('--marker-color', markerColor(point.population));
      el.innerHTML = `<span class="crowd-marker__value">${point.population.toLocaleString()}</span><span class="crowd-marker__name">${point.name}</span>`;
      el.setAttribute('aria-label', `${point.name} 추정 인구 ${point.population.toLocaleString()}명`);
      el.addEventListener('click', () => setSelected(point));

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [filtered, mapReady]);

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>실시간 혼잡도 지도</h1>
          <p>통신·공공 유동인구 데이터를 지도 위에 시각화</p>
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
          <button type="button" className="focus-button" onClick={focusSeoul}>서울 샘플 보기</button>
        </div>
      </section>

      <section className="map-wrap">
        <div ref={mapContainer} className="map" />
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
