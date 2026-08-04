# 통신 유동인구 혼잡도 지도 MVP

React + TypeScript + MapLibre 기반의 지도형 MVP입니다. 현재는 서울 샘플 데이터를 사용하며, 추후 서울시 실시간 도시데이터·SKT 지오비전·계약형 KT 데이터 어댑터로 교체할 수 있습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 프로덕션 빌드

```bash
npm run build
npm run preview
```

## GitHub Pages 배포

`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 자동으로 빌드하고 GitHub Pages에 배포합니다.

저장소 이름을 변경할 경우 `vite.config.ts`의 `base` 값도 변경해야 합니다.

## 실제 데이터 연동 권장 순서

1. 서울시 실시간 도시데이터 API로 서울 주요 장소 MVP 검증
2. SKT 지오비전 API 또는 데이터 상품 연동
3. KT 데이터는 B2B 계약이나 지자체 공개 데이터를 통해 연동

## 서버 구조 권장

- `/api/crowd?bbox=&zoom=&at=`: 클라이언트용 표준 API
- 공급자별 Adapter: `SeoulLiveAdapter`, `SktGeovisionAdapter`, `KtPopulationAdapter`
- Redis 5~15분 캐시
- PostGIS 격자 저장 및 줌 레벨별 집계
- 최소 인원 미만 격자 제거, 시간 지연, 반올림 등 재식별 방지

> API 키와 통신사 인증정보는 GitHub Pages 프런트엔드에 넣지 말고 Firebase Functions, Cloudflare Workers 또는 별도 백엔드에서 보관하세요.
