// functions/_middleware.js  — Cloudflare Pages Function
// ---------------------------------------------------------------------------
// 목적: 루트 페이지(pracexam.com) 하나로 "미국=영어, 한국=한글" 자동 분기.
//  - 한국 노출면(네이버 Yeti 봇 / 카카오톡 공유 스크래퍼 / 한국어 브라우저)
//    → <title>·description·og·twitter 를 한글로 교체
//  - 그 외(구글·페이스북·미국 사용자) → HTML 원본(영어) 그대로
// 봇이 받는 값 = 같은 언어 사용자가 받는 값이므로 클로킹(cloaking) 아님.
// ---------------------------------------------------------------------------

// 🔴 길이를 지킬 것 — 네이버 서치어드바이저 권고 = 제목 40자 · 설명 80자 이내.
//    2026-08-31 진단에서 제목 41자·설명 83자로 «넘친다»는 지적을 받았다(각각 1자·3자 초과).
//    낱말은 하나도 버리지 않고 붙여쓰기로만 줄였다 —
//      "한글 해설"→"한글해설"(제목 41→40) · "대비 "를 덜고 "모든 문항에"→"전 문항"(설명 83→78).
//    ⚠️ 여기를 고칠 때는 반드시 «글자 수를 세고» 넣을 것. 넘치면 검색 결과에서 잘린다.
const KO_TITLE = "미국세무사(EA) 문제은행 · 한글해설 5,000문항 | PracExam";                                   // 40자
const KO_DESC  = "미국세무사(EA) 시험 실전 문제 5,000+. Part 1·2·3 전 영역, 전 문항 한국어·영어 해설. 최신 세법 기준 온라인 문제은행.";  // 78자

// 🆕 2026-10-24 — 루트가 «중립 허브»가 되고 EA 는 /ea/ 로 옮겼다. 위 EA 제목·설명은 /ea/ 가 그대로 이어받고(순위 신호 유지),
//    허브(/)와 부동산(/re/)은 아래 자기 제목을 쓴다. 글자 수 기준(제목 40자 · 설명 80자)은 같다.
const KO_HUB_TITLE = "PracExam | 미국 세무사·부동산 중개사 시험 문제은행";
const KO_HUB_DESC  = "미국 세무사(EA)와 부동산 중개사 시험 실전 문제은행. 시험을 고르고 바로 연습하세요.";
const KO_RE_TITLE  = "미국 부동산 중개사 시험 문제은행 | PracExam";
const KO_RE_DESC   = "미국 부동산 중개사 시험 National·주(州) 실전 문제. 캘리포니아·뉴욕·텍사스·뉴저지, 문항별 해설과 시험 팁.";

// 경로 → 한글 제목·설명
function koCopy(url) {
  const p = url.pathname;
  if (p === "/" || p === "/index.html")           return { title: KO_HUB_TITLE, desc: KO_HUB_DESC };
  if (p === "/ea/" || p === "/ea/index.html")     return { title: KO_TITLE,     desc: KO_DESC };
  if (p === "/re/" || p === "/re/index.html")     return { title: KO_RE_TITLE,  desc: KO_RE_DESC };
  return null;
}

// 한국 노출면인지 판별
function wantsKorean(request) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const al = (request.headers.get("accept-language") || "").toLowerCase();

  // 한국 크롤러
  if (ua.includes("yeti"))            return true; // 네이버 검색 로봇
  if (ua.includes("kakaotalk-scrap")) return true; // 카카오톡 공유 미리보기
  if (ua.includes("daumoa"))          return true; // 다음

  // 한국어 사용자(사람)
  if (al.startsWith("ko"))            return true;

  return false; // 그 외 전부 영어(구글·페이스북·미국)
}

// <meta content="..."> 값 교체용 핸들러
class MetaRewriter {
  constructor(value) { this.value = value; }
  element(el) { el.setAttribute("content", this.value); }
}

// <title>...</title> 내부 텍스트 교체용 핸들러
class TitleRewriter {
  constructor(value) { this.value = value; }
  element(el) { el.setInnerContent(this.value); }
}

// 🔴 2026-08-31 — 이 바꿔치기는 «루트 한 장»에만 건다.
//
// [무엇이 잘못돼 있었나] 위 주석은 처음부터 "루트 페이지 하나로" 라고 적어 두었는데,
// 코드는 «모든 HTML» 에 걸리고 있었다. 그래서 한국어 브라우저·네이버 봇이 보면 —
//
//     /refund.html   → 미국세무사(EA) 문제은행 · 한글 해설 5,000문항 | PracExam
//     /privacy.html  → (같음)
//     /tips/ko/      → (같음)   ← 애써 쓴 글이 홈과 같은 제목을 달고 있었다
//
// [왜 큰일인가] 검색엔진과 AI 검색에게 «제목·설명이 같은 페이지»는 복사본이다.
// 한국어로 우리를 찾을 길을 우리 손으로 막고 있었다 — 유료 고객 한 분이 실제로
// ChatGPT 검색으로 들어오신 바로 그 경로다(2026-08-19 · utm_source=chatgpt.com).
//
// [고침] 경로가 루트일 때만 건다. 다른 페이지는 «자기 제목»을 그대로 쓴다
//        (그 페이지들은 이미 안에 KO/EN 두 벌을 다 갖고 있다).
// 🔴 새 페이지를 만들 때 이 목록에 더하지 말 것 — 루트만이 맞다.
// 🆕 2026-10-24 — «랜딩 세 장»(/ · /ea/ · /re/)에만 건다. 나머지는 여전히 손대지 않는다.
function isRoot(url) {
  return koCopy(url) !== null;
}

export async function onRequest(context) {
  const { request, next } = context;
  const response = await next();
  
    const _url = new URL(request.url);

  // 🆕 2026-09-12 — AI 답변엔진(Perplexity 등)이 로그인 화면(/app)을 "제품 소개"로
  // 착각해 인용한 사고 뒤 조치. 로그인 화면·관리자 화면은 검색·AI 색인에서 제외한다.
  const NOINDEX_PATHS = ["/app", "/app.html", "/review", "/admin"];
  if (NOINDEX_PATHS.some(function(p){ return _url.pathname === p || _url.pathname.startsWith(p + "/"); })) {
    const noIndexResp = new Response(response.body, response);
    noIndexResp.headers.set("X-Robots-Tag", "noindex, nofollow");
    return noIndexResp;
  }

  // HTML 응답에만 적용
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return response;

  // 루트가 아니면 손대지 않는다 (위 설명 참조)
  if (!isRoot(new URL(request.url))) return response;

  // 영어권이면 원본 그대로 반환
  if (!wantsKorean(request)) return response;
  const copy = koCopy(new URL(request.url));

  // UA/언어별로 응답이 달라지므로 캐시가 뒤섞이지 않도록 Vary 지정
  const rewritten = new HTMLRewriter()
    .on("title",                            new TitleRewriter(copy.title))
    .on('meta[name="description"]',         new MetaRewriter(copy.desc))
    .on('meta[property="og:title"]',        new MetaRewriter(copy.title))
    .on('meta[property="og:description"]',  new MetaRewriter(copy.desc))
    .on('meta[property="og:locale"]',       new MetaRewriter("ko_KR"))
    .on('meta[property="og:locale:alternate"]', new MetaRewriter("en_US"))
    .on('meta[name="twitter:title"]',       new MetaRewriter(copy.title))
    .on('meta[name="twitter:description"]', new MetaRewriter(copy.desc))
    .transform(response);

  const out = new Response(rewritten.body, rewritten);
  out.headers.append("Vary", "User-Agent, Accept-Language");
  return out;
}
