import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

type Level = 'city' | 'gu' | 'dong';
type CrowdArea = {
  id: string;
  name: string;
  level: Level;
  parent?: string;
  lat: number;
  lng: number;
  population: number;
};

const cityData: CrowdArea[] = [
  { id: 'seoul', name: '서울 전체', level: 'city', lat: 37.5665, lng: 126.978, population: 68400 }
];

const guData: CrowdArea[] = [
  { id: 'gangnam-gu', name: '강남구', level: 'gu', lat: 37.5172, lng: 127.0473, population: 16800 },
  { id: 'songpa-gu', name: '송파구', level: 'gu', lat: 37.5145, lng: 127.1059, population: 14100 },
  { id: 'mapo-gu', name: '마포구', level: 'gu', lat: 37.5663, lng: 126.9019, population: 12800 },
  { id: 'jung-gu', name: '중구', level: 'gu', lat: 37.5641, lng: 126.9979, population: 9900 },
  { id: 'yeongdeungpo-gu', name: '영등포구', level: 'gu', lat: 37.5264, lng: 126.8963, population: 8800 },
  { id: 'jongno-gu', name: '종로구', level: 'gu', lat: 37.5735, lng: 126.979, population: 6000 }
];

const dongData: CrowdArea[] = [
  { id: 'yeoksam1', name: '역삼1동', level: 'dong', parent: 'gangnam-gu', lat: 37.4999, lng: 127.0365, population: 5100 },
  { id: 'nonhyeon1', name: '논현1동', level: 'dong', parent: 'gangnam-gu', lat: 37.5113, lng: 127.0286, population: 4200 },
  { id: 'samseong1', name: '삼성1동', level: 'dong', parent: 'gangnam-gu', lat: 37.5143, lng: 127.0626, population: 3900 },
  { id: 'daechi4', name: '대치4동', level: 'dong', parent: 'gangnam-gu', lat: 37.4997, lng: 127.0575, population: 3600 },

  { id: 'jamsil2', name: '잠실2동', level: 'dong', parent: 'songpa-gu', lat: 37.5117, lng: 127.0896, population: 4400 },
  { id: 'jamsil6', name: '잠실6동', level: 'dong', parent: 'songpa-gu', lat: 37.5186, lng: 127.1012, population: 3900 },
  { id: 'munjeong2', name: '문정2동', level: 'dong', parent: 'songpa-gu', lat: 37.4843, lng: 127.122, population: 3200 },
  { id: 'seokchon', name: '석촌동', level: 'dong', parent: 'songpa-gu', lat: 37.5037, lng: 127.103, population: 2600 },

  { id: 'seogyo', name: '서교동', level: 'dong', parent: 'mapo-gu', lat: 37.5551, lng: 126.922, population: 5200 },
  { id: 'hapjeong', name: '합정동', level: 'dong', parent: 'mapo-gu', lat: 37.5495, lng: 126.9137, population: 2800 },
  { id: 'gongdeok', name: '공덕동', level: 'dong', parent: 'mapo-gu', lat: 37.5444, lng: 126.9516, population: 2500 },
  { id: 'sangam', name: '상암동', level: 'dong', parent: 'mapo-gu', lat: 37.5782, lng: 126.8897, population: 2300 },

  { id: 'hoeheon', name: '회현동', level: 'dong', parent: 'jung-gu', lat: 37.5573, lng: 126.9811, population: 3100 },
  { id: 'myeongdong', name: '명동', level: 'dong', parent: 'jung-gu', lat: 37.5609, lng: 126.986, population: 2900 },
  { id: 'gwanghui', name: '광희동', level: 'dong', parent: 'jung-gu', lat: 37.5652, lng: 127.0051, population: 2100 },
  { id: 'sogong', name: '소공동', level: 'dong', parent: 'jung-gu', lat: 37.5643, lng: 126.977, population: 1800 },

  { id: 'yeouido', name: '여의동', level: 'dong', parent: 'yeongdeungpo-gu', lat: 37.5219, lng: 126.9245, population: 4300 },
  { id: 'dangsan2', name: '당산2동', level: 'dong', parent: 'yeongdeungpo-gu', lat: 37.5336, lng: 126.9026, population: 1900 },
  { id: 'mullae', name: '문래동', level: 'dong', parent: 'yeongdeungpo-gu', lat: 37.5177, lng: 126.8955, population: 1500 },
  { id: 'yeongdeungpo', name: '영등포동', level: 'dong', parent: 'yeongdeungpo-gu', lat: 37.5204, lng: 126.9072, population: 1100 },

  { id: 'jongno1', name: '종로1·2·3·4가동', level: 'dong', parent: 'jongno-gu', lat: 37.5704, lng: 126.989, population: 2500 },
  { id: 'sajik', name: '사직동', level: 'dong', parent: 'jongno-gu', lat: 37.576, lng: 126.968, population: 1300 },
  { id: 'cheongun', name: '청운효자동', level: 'dong', parent: 'jongno-gu', lat: 37.584, lng: 126.9707, population: 1200 },
  { id: 'hyehwa', name: '혜화동', level: 'dong', parent: 'jongno-gu', lat: 37.586, lng: 127.0008, population: 1000 }
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

function markerColor(population: number, level: Level) {
  const max = level === 'city' ? 70000 : level === 'gu' ? 18000 : 5500;
  const ratio = population / max;
  if (ratio >= 0.78) return '#d7191c';
  if (ratio >= 0.58) return '#f57c00';
  if (ratio >= 0.38) return '#fbc02d';
  if (ratio >= 0.2) return '#00a6ca';
  return '#2c7bb6';
}

function levelForZoom(zoom: number): Level {
  if (zoom < 10.5) return 'city';
  if (zoom < 13) return 'gu';
  return 'dong';
}

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [zoomLevel, setZoomLevel] = useState(10.2);
  const [threshold, setThreshold] = useState(0);
  const [selected, setSelected] = useState<CrowdArea | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const level = levelForZoom(zoomLevel);
  const sourceData = level === 'city' ? cityData : level === 'gu' ? guData : dongData;
  const visibleAreas = useMemo(
    () => sourceData.filter((area) => area.population >= threshold),
    [sourceData, threshold]
  );
  const total = visibleAreas.reduce((sum, area) => sum + area.population, 0);

  const focusSeoul = () => {
    mapRef.current?.fitBounds([[126.80, 37.43], [127.18, 37.70]], { padding: 40, duration: 500 });
  };

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: baseMapStyle,
      center: [126.985, 37.56],
      zoom: 10.2
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => {
      setMapReady(true);
      setZoomLevel(map.getZoom());
    });
    map.on('zoom', () => setZoomLevel(map.getZoom()));
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    visibleAreas.forEach((area) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `crowd-marker crowd-marker--${area.level}`;
      el.style.setProperty('--marker-color', markerColor(area.population, area.level));
      el.innerHTML = `<span class="crowd-marker__value">${area.population.toLocaleString()}</span><span class="crowd-marker__name">${area.name}</span>`;
      el.setAttribute('aria-label', `${area.name} 추정 인구 ${area.population.toLocaleString()}명`);
      el.addEventListener('click', () => {
        setSelected(area);
        if (area.level === 'city') map.easeTo({ center: [area.lng, area.lat], zoom: 11.2 });
        if (area.level === 'gu') map.easeTo({ center: [area.lng, area.lat], zoom: 13.5 });
      });
      markersRef.current.push(
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([area.lng, area.lat])
          .addTo(map)
      );
    });
  }, [visibleAreas, mapReady]);

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>실시간 혼잡도 지도</h1>
          <p>확대 수준에 따라 서울 전체 → 구 → 동 단위로 전환</p>
        </div>
        <span className="status">● 계층형 샘플 데이터</span>
      </header>

      <section className="controls">
        <label>
          최소 표시 인구: <strong>{threshold.toLocaleString()}명</strong>
          <input type="range" min="0" max={level === 'city' ? 60000 : level === 'gu' ? 15000 : 5000} step="500" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} />
        </label>
        <div className="metrics">
          <span>현재 단위 <strong>{level === 'city' ? '서울 전체' : level === 'gu' ? '구' : '동'}</strong></span>
          <span>확대 <strong>{zoomLevel.toFixed(1)}</strong></span>
          <span>표시 지역 <strong>{visibleAreas.length}</strong></span>
          <span>합계 <strong>{total.toLocaleString()}명</strong></span>
          <button type="button" className="focus-button" onClick={focusSeoul}>서울 전체 보기</button>
        </div>
      </section>

      <section className="map-wrap">
        <div ref={mapContainer} className="map" />
        <div className="zoom-guide">축소: 서울 전체 · 중간: 구별 · 확대: 동별</div>
        <div className="legend"><span>적음</span><i className="gradient" /><span>많음</span></div>
        {selected && (
          <aside className="detail">
            <button onClick={() => setSelected(null)} aria-label="닫기">×</button>
            <h2>{selected.name}</h2>
            <p className="big">{selected.population.toLocaleString()}명</p>
            <p>표시 단위: {selected.level === 'city' ? '도시' : selected.level === 'gu' ? '자치구' : '행정동'}</p>
            {selected.level !== 'dong' && <p>마커를 누르면 하위 단위로 확대됩니다.</p>}
          </aside>
        )}
      </section>

      <footer>표시 값과 좌표는 기능 검증용 샘플입니다. 실제 서비스에서는 통신사·공공 집계 데이터를 연결해야 합니다.</footer>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');
createRoot(root).render(<App />);
