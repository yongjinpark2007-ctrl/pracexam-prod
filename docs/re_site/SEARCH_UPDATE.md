# 검색엔진 업데이트 — 머지 뒤 사장님이 할 일 (2026-10-24)

`re-site` 가 main 에 머지되어 Cloudflare 배포가 끝난 «뒤에» 하십시오. 머지 전에 하면 검색엔진이 옛 주소를 읽습니다.

먼저 배포본 확인 (브라우저에서 눈으로):
- https://pracexam.com/ → 허브(로그인 + EA / Real Estate 두 문)
- https://pracexam.com/ea/ → 예전 EA 랜딩 (`/ea` 도 `/ea/` 로 넘어가야 함)
- https://pracexam.com/re/ → 부동산 랜딩
- https://pracexam.com/sitemap.xml → `/`, `/ea/`, `/re/` 가 들어 있고 lastmod 가 2026-10-24
- https://pracexam.com/llms.txt, https://pracexam.com/robots.txt

## 0. 머지 전후 (기존 고객 보호)
- **트래픽이 적은 시간에 머지**하고, 끝나면 «바로» 아래를 시험해 보십시오.
  1. 로그인 → 앱 열기 (허브에서, 그리고 `/app` 직접)
  2. 설치해 둔 PWA(홈 화면 앱) 열기 — `start_url` 은 `/app.html` 그대로입니다
  3. 비밀번호 재설정 메일 받아서 링크 눌러 보기
  4. Paddle 샌드박스로 결제 마치고 «돌아오기» 확인
- 레포 밖에서 확인할 것 (사장님/Jay):
  - Supabase Auth → **Site URL** 은 `https://pracexam.com` 그대로 둔다 (예비 주소일 뿐; 가입·재설정은 `/app.html` 로 돌아옵니다).
  - **Brevo 메일 템플릿**과 **Paddle 성공/취소 URL** 이 «`/`» 를 «EA 페이지» 뜻으로 쓰고 있는지 확인. 그렇다면 `/ea/` 로 바꾸거나, 허브(`/`)로 와도 되는지 결정.
- 실패하면 `docs/re_site/CHANGES.md` 의 Rollback 한 줄(`git revert`)로 되돌립니다.

## 1. Google Search Console
1. search.google.com/search-console → 속성 `pracexam.com`
2. 색인 생성 → **Sitemaps** → `sitemap.xml` 제출 (이미 있으면 «다시 제출»; 상태가 «성공» 이 될 때까지 기다림)
3. 위쪽 검사창(**URL Inspection**)에 아래 세 주소를 «하나씩» 넣고 → **Request Indexing**
   - `https://pracexam.com/`
   - `https://pracexam.com/ea/`
   - `https://pracexam.com/re/`
4. `/ea/` 는 «사용자가 선언한 canonical = /ea/» 로 읽혀야 합니다. 옛 `/` 의 순위 신호는 `/ea/` 로 옮겨 가는 데 며칠~몇 주 걸릴 수 있습니다 (제목·설명·FAQ 는 그대로라 같은 글로 인식됩니다).

## 2. Bing Webmaster Tools
1. bing.com/webmasters → 사이트 `pracexam.com` (`BingSiteAuth.xml` 로 이미 소유확인됨)
2. **Sitemaps** → `https://pracexam.com/sitemap.xml` 제출
3. **URL Submission** 에 위 세 주소를 넣고 제출 (ChatGPT 검색이 Bing 색인에 기대므로 중요)

## 3. IndexNow (Bing 등에 «바뀌었다» 즉시 알림)
IndexNow 는 사이트 맨 위에 «키 파일» 이 있어야 합니다. 이 레포에는 아직 없습니다.
1. bing.com/indexnow 에서 키를 만든다 (영문·숫자 8~128자, 예 `a1b2c3d4e5f6...`).
2. 레포 최상위에 `<키>.txt` 파일을 만들고 «안에 키 값만» 적어 커밋·배포한다 → `https://pracexam.com/<키>.txt` 가 열려야 함.
3. 아래 세 주소를 브라우저 주소창에 «하나씩» 붙여 넣는다 (`<키>` 를 바꿔서). `200` 또는 `202` 면 접수된 것입니다.
   - https://api.indexnow.org/indexnow?url=https://pracexam.com/&key=<키>&keyLocation=https://pracexam.com/<키>.txt
   - https://api.indexnow.org/indexnow?url=https://pracexam.com/ea/&key=<키>&keyLocation=https://pracexam.com/<키>.txt
   - https://api.indexnow.org/indexnow?url=https://pracexam.com/re/&key=<키>&keyLocation=https://pracexam.com/<키>.txt

## 4. 네이버 (한국 노출)
- 서치어드바이저 소유확인이 아직 비어 있습니다 (`index.html` 의 `naver-site-verification` 자리표시자). 허브(`/`)에 같은 자리가 있으니 인증 코드를 받으면 거기에 넣고, 사이트맵을 제출하십시오.
- 한글 제목·설명은 `functions/_middleware.js` 가 `/`, `/ea/`, `/re/` 세 장에 내줍니다.

## 5. 나중에 (선택)
- 부동산 주별 페이지(`/re/ca/` 등)를 만들 때마다 `sitemap.xml` 에 한 줄 추가하고 위 1~3 을 그 주소로 반복.
- 새 시험 `/<exam>/` 을 만들 때도 같습니다.
