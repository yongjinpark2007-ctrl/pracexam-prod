// PracExam 최소 서비스워커 (2026-07-18)
// 목적: PWA 설치성 확보 + 등록 실패 콘솔 경고 제거.
// 캐싱은 의도적으로 하지 않음(pass-through) — app.html이 항상 서버 최신본을 받도록.
// (배포본 캐시가 남아 구버전이 뜨는 문제를 피하기 위한 보수적 선택. 오프라인 지원이
//  필요해지면 이 파일에 캐시 전략을 추가할 것.)
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
// fetch 핸들러 없음 = 모든 요청이 네트워크로 그대로 나감.
