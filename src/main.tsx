import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

type CityId = 'seoul' | 'busan';
type Level = 'city' | 'gu' | 'dong' | 'grid';
type CrowdArea = { id: string; city: CityId; name: string; level: Exclude<Level, 'grid'>; lat: number; lng: number; population: number };
type GridCell = { id: string; city: CityId; name: string; level: 'grid'; population: number; west: number; south: number; east: number; north: number };
type SelectedItem = CrowdArea | GridCell;
type ViewBounds = { west: number; south: number; east: number; north: number };
type Place = { name: string; aliases: string[]; city: CityId; lat: number; lng: number };

const places: Place[] = [
  { name: '해운대해수욕장', aliases: ['해운대', '해운대역', '해운대해수욕장'], city: 'busan', lat: 35.1587, lng: 129.1604 },
  { name: '압구정역', aliases: ['압구정', '압구정역'], city: 'seoul', lat: 37.5271, lng: 127.0285 },
  { name: '강남역', aliases: ['강남', '강남역'], city: 'seoul', lat: 37.4979, lng: 127.0276 },
  { name: '서면역', aliases: ['서면', '서면역'], city: 'busan', lat: 35.1578, lng: 129.0591 },
  { name: '광안리해수욕장', aliases: ['광안리', '광안리해수욕장'], city: 'busan', lat: 35.1532, lng: 129.1187 },
  { name: '홍대입구역', aliases: ['홍대', '홍대입구', '홍대입구역'], city: 'seoul', lat: 37.5563, lng: 126.9236 }
];

const cityData: CrowdArea[] = [
  { id: 'seoul', city: 'seoul', name: '서울', level: 'city', lat: 37.5665, lng: 126.978, population: 68400 },
  { id: 'busan', city: 'busan', name: '부산', level: 'city', lat: 35.1796, lng: 129.0756, population: 47200 }
];

const guData: CrowdArea[] = [
  { id: 'gangnam-gu', city: 'seoul', name: '강남구', level: 'gu', lat: 37.5172, lng: 127.0473, population: 16800 },
  { id: 'songpa-gu', city: 'seoul', name: '송파구', level: 'gu', lat: 37.5145, lng: 127.1059, population: 14100 },
  { id: 'mapo-gu', city: 'seoul', name: '마포구', level: 'gu', lat: 37.5663, lng: 126.9019, population: 12800 },
  { id: 'busanjin-gu', city: 'busan', name: '부산진구', level: 'gu', lat: 35.1629, lng: 129.0532, population: 12100 },
  { id: 'haeundae-gu', city: 'busan', name: '해운대구', level: 'gu', lat: 35.1631, lng: 129.1635, population: 11600 },
  { id: 'suyeong-gu', city: 'busan', name: '수영구', level: 'gu', lat: 35.1457, lng: 129.1132, population: 8200 }
];

const dongData: CrowdArea[] = [
  { id: 'apgujeong', city: 'seoul', name: '압구정동', level: 'dong', lat: 37.5271, lng: 127.0285, population: 4600 },
  { id: 'yeoksam1', city: 'seoul', name: '역삼1동', level: 'dong', lat: 37.4999, lng: 127.0365, population: 5100 },
  { id: 'nonhyeon1', city: 'seoul', name: '논현1동', level: 'dong', lat: 37.5113, lng: 127.0286, population: 4200 },
  { id: 'seogyo', city: 'seoul', name: '서교동', level: 'dong', lat: 37.5551, lng: 126.922, population: 5200 },
  { id: 'u1', city: 'busan', name: '우1동', level: 'dong', lat: 35.1628, lng: 129.158, population: 4300 },
  { id: 'jung1', city: 'busan', name: '중1동', level: 'dong', lat: 35.1638, lng: 129.1687, population: 3700 },
  { id: 'bujeon2', city: 'busan', name: '부전2동', level: 'dong', lat: 35.1577, lng: 129.0592, population: 4700 },
  { id: 'gwangan2', city: 'busan', name: '광안2동', level: 'dong', lat: 35.1532, lng: 129.1187, population: 3300 }
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
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
};

function levelForZoom(zoom: number): Level {
  if (zoom < 8.5) return 'city';
  if (zoom < 12.5) return 'gu';
  if (zoom < 15) return 'dong';
  return 'grid';
}

function markerColor(population: number, level: Level) {
  const max = level === 'city' ? 70000 : level === 'gu' ? 18000 : 5500;
  const ratio = population / max;
  if (ratio >= 0.78) return '#d7191c';
  if (ratio >= 0.58) return '#f57c00';
  if (ratio >= 0.38) return '#fbc02d';
  if (ratio >= 0.2) return '#00a6ca';
  return '#2c7bb6';
}

function gridColor(population: number) {
  if (population >= 1000) return '#d7191c';
  if (population >= 800) return '#f57c00';
  if (population >= 550) return '#fbc02d';
  if (population >= 300) return '#00a6ca';
  return '#2c7bb6';
}

function distance(a: { lng: number; lat: number }, b: CrowdArea) {
  return Math.hypot(a.lng - b.lng, a.lat - b.lat);
}

function populationForCell(row: number, col: number, city: CityId) {
  let value = Math.imul(row + 104729, 73856093) ^ Math.imul(col + 130363, 19349663);
  value ^= city === 'seoul' ? 83492791 : 297121507;
  return 120 + Math.abs(value % 1081);
}

function createViewportGrid(bounds: ViewBounds, city: CityId, areaName: string): GridCell[] {
  const latStep = 250 / 111320;
  const referenceLat = (bounds.south + bounds.north) / 2;
  const lngStep = 250 / (111320 * Math.cos(referenceLat * Math.PI / 180));
  const startRow = Math.floor(bounds.south / latStep) - 1;
  const endRow = Math.ceil(bounds.north / latStep) + 1;
  const startCol = Math.floor(bounds.west / lngStep) - 1;
  const endCol = Math.ceil(bounds.east / lngStep) + 1;
  const cells: GridCell[] = [];

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const south = row * latStep;
      const west = col * lngStep;
      cells.push({
        id: `${city}-${row}-${col}`,
        city,
        name: `${areaName} 250m 격자`,
        level: 'grid',
        population: populationForCell(row, col, city),
        west,
        south,
        east: west + lngStep,
        north: south + latStep
      });
    }
  }
  return cells;
}

function findPlace(query: string) {
  const normalized = query.trim().replace(/\s+/g, '').toLowerCase();
  return places.find((place) => place.aliases.some((alias) => alias.replace(/\s+/g, '').toLowerCase().includes(normalized) || normalized.includes(alias.replace(/\s+/g, '').toLowerCase())));
}

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const gridOverlay = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [zoom, setZoom] = useState(6.5);
  const [city, setCity] = useState<CityId>('seoul');
  const [threshold, setThreshold] = useState(0);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [ready, setReady] = useState(false);
  const [center, setCenter] = useState({ lng: 127.8, lat: 36.3 });
  const [viewBounds, setViewBounds] = useState<ViewBounds | null>(null);
  const [query, setQuery] = useState('');
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const [searchError, setSearchError] = useState('');
  const level = levelForZoom(zoom);

  const nearestDong = useMemo(
    () => dongData.filter((item) => item.city === city).sort((a, b) => distance(center, a) - distance(center, b))[0],
    [city, center]
  );

  const areas = useMemo(() => {
    if (level === 'city') return cityData.filter((item) => item.population >= threshold);
    const data = level === 'gu' ? guData : dongData;
    return data.filter((item) => item.city === city && item.population >= threshold);
  }, [level, city, threshold]);

  const cells = useMemo(() => {
    if (level !== 'grid' || !viewBounds) return [];
    const areaName = activePlace?.name ?? nearestDong?.name ?? '현재 위치';
    return createViewportGrid(viewBounds, city, areaName).filter((cell) => cell.population >= threshold);
  }, [level, viewBounds, city, activePlace, nearestDong, threshold]);

  const moveToPlace = (place: Place) => {
    setCity(place.city);
    setThreshold(0);
    setSelected(null);
    setActivePlace(place);
    setQuery(place.name);
    setSearchError('');
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ center: [place.lng, place.lat], zoom: 16, duration: 800 });
    searchMarkerRef.current?.remove();
    const markerElement = document.createElement('div');
    markerElement.className = 'search-pin';
    markerElement.title = place.name;
    searchMarkerRef.current = new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
      .setLngLat([place.lng, place.lat])
      .addTo(map);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const place = findPlace(query);
    if (!place) {
      setSearchError('현재 샘플에서는 해운대, 압구정역, 강남역, 서면역, 광안리, 홍대를 검색할 수 있습니다.');
      return;
    }
    moveToPlace(place);
  };

  const focusCity = (nextCity: CityId) => {
    setCity(nextCity);
    setThreshold(0);
    setSelected(null);
    setActivePlace(null);
    setQuery('');
    setSearchError('');
    searchMarkerRef.current?.remove();
    searchMarkerRef.current = null;
    const target = nextCity === 'seoul'
      ? { center: [127.0365, 37.4999] as [number, number], zoom: 11 }
      : { center: [129.12, 35.16] as [number, number], zoom: 11 };
    mapRef.current?.easeTo({ ...target, duration: 700 });
  };

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: mapContainer.current, style: baseMapStyle, center: [127.8, 36.3], zoom: 6.5 });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const sync = () => {
      const currentCenter = map.getCenter();
      const bounds = map.getBounds();
      setZoom(map.getZoom());
      setCenter({ lng: currentCenter.lng, lat: currentCenter.lat });
      setViewBounds({ west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() });
    };

    map.on('load', () => { setReady(true); sync(); });
    map.on('zoom', sync);
    map.on('moveend', sync);
    map.on('resize', sync);
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      searchMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    areas.forEach((area) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = `crowd-marker crowd-marker--${area.level}`;
      element.style.setProperty('--marker-color', markerColor(area.population, area.level));
      element.innerHTML = `<span class="crowd-marker__value">${area.population.toLocaleString()}</span><span class="crowd-marker__name">${area.name}</span>`;
      element.onclick = () => {
        setSelected(area);
        setCity(area.city);
        if (area.level === 'city') map.easeTo({ center: [area.lng, area.lat], zoom: 10.5 });
        if (area.level === 'gu') map.easeTo({ center: [area.lng, area.lat], zoom: 13.3 });
        if (area.level === 'dong') map.easeTo({ center: [area.lng, area.lat], zoom: 15.4 });
      };
      markersRef.current.push(new maplibregl.Marker({ element }).setLngLat([area.lng, area.lat]).addTo(map));
    });
  }, [areas, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const overlay = gridOverlay.current;
    if (!map || !overlay || !ready) return;
    overlay.innerHTML = '';

    const elements = cells.map((cell) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'grid-cell';
      element.style.background = gridColor(cell.population);
      element.innerHTML = `<strong>${cell.population.toLocaleString()}</strong><span>명</span>`;
      element.title = `${cell.name}: ${cell.population.toLocaleString()}명`;
      element.onclick = () => setSelected(cell);
      overlay.appendChild(element);
      return { cell, element };
    });

    const draw = () => {
      elements.forEach(({ cell, element }) => {
        const nw = map.project([cell.west, cell.north]);
        const se = map.project([cell.east, cell.south]);
        element.style.left = `${nw.x}px`;
        element.style.top = `${nw.y}px`;
        element.style.width = `${Math.max(1, se.x - nw.x)}px`;
        element.style.height = `${Math.max(1, se.y - nw.y)}px`;
      });
    };

    draw();
    map.on('render', draw);
    return () => {
      map.off('render', draw);
      overlay.innerHTML = '';
    };
  }, [cells, ready]);

  const list = level === 'grid' ? cells : areas;
  const total = list.reduce((sum, item) => sum + item.population, 0);
  const unitName = level === 'city' ? '도시' : level === 'gu' ? '구' : level === 'dong' ? '동' : `250m 격자 · ${activePlace?.name ?? nearestDong?.name ?? ''}`;

  return <main className="app">
    <header className="topbar">
      <div><h1>실시간 혼잡도 지도</h1><p>장소 검색 → 해당 위치의 250m 격자 혼잡도 확인</p></div>
      <span className="status">● 서울·부산 샘플</span>
    </header>

    <form className="place-search" onSubmit={submitSearch}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 해운대, 압구정역" aria-label="장소 검색" />
      <button type="submit">검색</button>
      <button type="button" onClick={() => moveToPlace(places[0])}>해운대</button>
      <button type="button" onClick={() => moveToPlace(places[1])}>압구정역</button>
      {searchError && <span className="search-error">{searchError}</span>}
    </form>

    <section className="controls">
      <label>최소 표시 인구: <strong>{threshold.toLocaleString()}명</strong><input type="range" min="0" max={level === 'grid' ? 1100 : level === 'dong' ? 5000 : 15000} step={level === 'grid' ? 50 : 500} value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /></label>
      <div className="metrics">
        <span>현재 <strong>{city === 'seoul' ? '서울' : '부산'} · {unitName}</strong></span>
        <span>확대 <strong>{zoom.toFixed(1)}</strong></span>
        <span>표시 <strong>{list.length}</strong></span>
        <span>합계 <strong>{total.toLocaleString()}명</strong></span>
        <button className="focus-button" onClick={() => focusCity('seoul')}>서울 보기</button>
        <button className="focus-button" onClick={() => focusCity('busan')}>부산 보기</button>
      </div>
    </section>

    <section className="map-wrap">
      <div ref={mapContainer} className="map" />
      <div ref={gridOverlay} className="grid-overlay" />
      <div className="zoom-guide">장소 검색 시 확대 16으로 이동하며, 화면 전체에 250m 격자가 자동 생성됩니다.</div>
      <div className="legend"><span>적음</span><i className="gradient" /><span>많음</span></div>
      {selected && <aside className="detail"><button onClick={() => setSelected(null)}>×</button><h2>{selected.name}</h2><p className="big">{selected.population.toLocaleString()}명</p><p>샘플 집계 데이터</p></aside>}
    </section>

    <footer>현재 혼잡도 값은 기능 확인용 샘플입니다. 실제 서비스에서는 통신사·공공 집계 API를 연결해야 합니다.</footer>
  </main>;
}

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');
createRoot(root).render(<App />);
