import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

type CityId = 'seoul' | 'busan';
type Level = 'city' | 'gu' | 'dong' | 'grid';
type CrowdArea = { id: string; city: CityId; name: string; level: Exclude<Level, 'grid'>; lat: number; lng: number; population: number };
type GridCell = { id: string; city: CityId; dongId: string; name: string; level: 'grid'; population: number; west: number; south: number; east: number; north: number };
type SelectedItem = CrowdArea | GridCell;

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
  { id: 'yeoksam1', city: 'seoul', name: '역삼1동', level: 'dong', lat: 37.4999, lng: 127.0365, population: 5100 },
  { id: 'nonhyeon1', city: 'seoul', name: '논현1동', level: 'dong', lat: 37.5113, lng: 127.0286, population: 4200 },
  { id: 'samseong1', city: 'seoul', name: '삼성1동', level: 'dong', lat: 37.5143, lng: 127.0626, population: 3900 },
  { id: 'jamsil2', city: 'seoul', name: '잠실2동', level: 'dong', lat: 37.5117, lng: 127.0896, population: 4400 },
  { id: 'seogyo', city: 'seoul', name: '서교동', level: 'dong', lat: 37.5551, lng: 126.922, population: 5200 },
  { id: 'bujeon2', city: 'busan', name: '부전2동', level: 'dong', lat: 35.1577, lng: 129.0592, population: 4700 },
  { id: 'jeonpo1', city: 'busan', name: '전포1동', level: 'dong', lat: 35.157, lng: 129.0675, population: 3500 },
  { id: 'bujeon1', city: 'busan', name: '부전1동', level: 'dong', lat: 35.1635, lng: 129.058, population: 3200 },
  { id: 'u1', city: 'busan', name: '우1동', level: 'dong', lat: 35.1628, lng: 129.158, population: 4300 },
  { id: 'jung1', city: 'busan', name: '중1동', level: 'dong', lat: 35.1638, lng: 129.1687, population: 3700 },
  { id: 'gwangan2', city: 'busan', name: '광안2동', level: 'dong', lat: 35.1532, lng: 129.1187, population: 3300 }
];

const values = [180, 420, 780, 360, 260, 650, 1180, 720, 150, 530, 910, 470];
function makeGrid(area: CrowdArea): GridCell[] {
  const latStep = 0.00225;
  const lngStep = area.city === 'seoul' ? 0.00282 : 0.00274;
  return values.map((population, index) => {
    const row = Math.floor(index / 4) - 1;
    const col = (index % 4) - 1.5;
    const west = area.lng + col * lngStep;
    const south = area.lat + row * latStep;
    return { id: `${area.id}-grid-${index + 1}`, city: area.city, dongId: area.id, name: `${area.name} 격자 ${index + 1}`, level: 'grid', population, west, south, east: west + lngStep, north: south + latStep };
  });
}
const gridData = dongData.flatMap(makeGrid);

const baseMapStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
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
  if (ratio >= .78) return '#d7191c'; if (ratio >= .58) return '#f57c00'; if (ratio >= .38) return '#fbc02d'; if (ratio >= .2) return '#00a6ca'; return '#2c7bb6';
}
function gridGeoJSON(cells: GridCell[]) {
  return { type: 'FeatureCollection' as const, features: cells.map(cell => ({ type: 'Feature' as const, properties: { id: cell.id, name: cell.name, population: cell.population }, geometry: { type: 'Polygon' as const, coordinates: [[[cell.west, cell.south], [cell.east, cell.south], [cell.east, cell.north], [cell.west, cell.north], [cell.west, cell.south]]] } })) };
}
function distance(a: {lng:number;lat:number}, b: CrowdArea) { return Math.hypot(a.lng - b.lng, a.lat - b.lat); }

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [zoom, setZoom] = useState(6.5);
  const [city, setCity] = useState<CityId>('seoul');
  const [threshold, setThreshold] = useState(0);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [ready, setReady] = useState(false);
  const [center, setCenter] = useState({ lng: 127.8, lat: 36.3 });
  const level = levelForZoom(zoom);

  const nearestDong = useMemo(() => dongData.filter(d => d.city === city).sort((a,b) => distance(center,a)-distance(center,b))[0], [city, center]);
  const areas = useMemo(() => {
    if (level === 'city') return cityData.filter(x => x.population >= threshold);
    const data = level === 'gu' ? guData : dongData;
    return data.filter(x => x.city === city && x.population >= threshold);
  }, [level, city, threshold]);
  const cells = useMemo(() => level === 'grid' && nearestDong ? gridData.filter(x => x.dongId === nearestDong.id && x.population >= threshold) : [], [level, nearestDong, threshold]);

  const focusCity = (nextCity: CityId) => {
    setCity(nextCity); setThreshold(0); setSelected(null);
    const target = nextCity === 'seoul' ? { center: [127.0365, 37.4999] as [number,number], zoom: 11 } : { center: [129.12, 35.16] as [number,number], zoom: 11 };
    mapRef.current?.easeTo({ ...target, duration: 700 });
  };

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: mapContainer.current, style: baseMapStyle, center: [127.8, 36.3], zoom: 6.5 });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => {
      map.addSource('crowd-grid', { type: 'geojson', data: gridGeoJSON([]) });
      map.addLayer({ id: 'crowd-grid-fill', type: 'fill', source: 'crowd-grid', paint: { 'fill-color': ['step', ['get','population'], '#2c7bb6', 300, '#00a6ca', 550, '#fbc02d', 800, '#f57c00', 1000, '#d7191c'], 'fill-opacity': .62, 'fill-outline-color': '#ffffff' } });
      map.addLayer({ id: 'crowd-grid-label', type: 'symbol', source: 'crowd-grid', layout: { 'text-field': ['concat', ['to-string',['get','population']], '명'], 'text-size': 12 }, paint: { 'text-color': '#172033', 'text-halo-color': '#ffffff', 'text-halo-width': 2 } });
      map.on('click', 'crowd-grid-fill', e => { const id = e.features?.[0]?.properties?.id; const cell = gridData.find(x => x.id === id); if (cell) setSelected(cell); });
      setReady(true);
    });
    const sync = () => { const c = map.getCenter(); setZoom(map.getZoom()); setCenter({ lng: c.lng, lat: c.lat }); };
    map.on('zoom', sync); map.on('moveend', sync); mapRef.current = map;
    return () => { markersRef.current.forEach(m => m.remove()); map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    markersRef.current.forEach(m => m.remove()); markersRef.current = [];
    areas.forEach(area => {
      const el = document.createElement('button'); el.type='button'; el.className=`crowd-marker crowd-marker--${area.level}`; el.style.setProperty('--marker-color', markerColor(area.population, area.level));
      el.innerHTML=`<span class="crowd-marker__value">${area.population.toLocaleString()}</span><span class="crowd-marker__name">${area.name}</span>`;
      el.onclick=()=>{ setSelected(area); setCity(area.city); if(area.level==='city') map.easeTo({center:[area.lng,area.lat],zoom:10.5}); if(area.level==='gu') map.easeTo({center:[area.lng,area.lat],zoom:13.3}); if(area.level==='dong') map.easeTo({center:[area.lng,area.lat],zoom:15.4}); };
      markersRef.current.push(new maplibregl.Marker({element:el}).setLngLat([area.lng,area.lat]).addTo(map));
    });
    (map.getSource('crowd-grid') as maplibregl.GeoJSONSource).setData(gridGeoJSON(cells));
  }, [areas, cells, ready]);

  const list = level === 'grid' ? cells : areas;
  const total = list.reduce((sum,x)=>sum+x.population,0);
  const unitName = level === 'city' ? '도시' : level === 'gu' ? '구' : level === 'dong' ? '동' : `250m 격자 · ${nearestDong?.name ?? ''}`;

  return <main className="app">
    <header className="topbar"><div><h1>실시간 혼잡도 지도</h1><p>도시 → 구 → 동 → 250m 격자로 단계 전환</p></div><span className="status">● 서울·부산 샘플</span></header>
    <section className="controls"><label>최소 표시 인구: <strong>{threshold.toLocaleString()}명</strong><input type="range" min="0" max={level==='grid'?1100:level==='dong'?5000:15000} step={level==='grid'?50:500} value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/></label><div className="metrics"><span>현재 <strong>{city==='seoul'?'서울':'부산'} · {unitName}</strong></span><span>확대 <strong>{zoom.toFixed(1)}</strong></span><span>표시 <strong>{list.length}</strong></span><span>합계 <strong>{total.toLocaleString()}명</strong></span><button className="focus-button" onClick={()=>focusCity('seoul')}>서울 보기</button><button className="focus-button" onClick={()=>focusCity('busan')}>부산 보기</button></div></section>
    <section className="map-wrap"><div ref={mapContainer} className="map"/><div className="zoom-guide">축소: 도시 · 중간: 구 · 확대: 동 · 15 이상: 현재 위치에서 가장 가까운 동의 250m 격자</div><div className="legend"><span>적음</span><i className="gradient"/><span>많음</span></div>{selected&&<aside className="detail"><button onClick={()=>setSelected(null)}>×</button><h2>{selected.name}</h2><p className="big">{selected.population.toLocaleString()}명</p><p>샘플 집계 데이터</p></aside>}</section>
    <footer>현재 값은 기능 확인용 샘플입니다. 실제 서비스에서는 통신사·공공 집계 데이터를 연결해야 합니다.</footer>
  </main>;
}

const root=document.getElementById('root'); if(!root) throw new Error('root element not found'); createRoot(root).render(<App/>);
