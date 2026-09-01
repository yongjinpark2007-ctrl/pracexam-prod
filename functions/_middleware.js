// functions/_middleware.js  — Cloudflare Pages Function
// ---------------------------------------------------------------------------
// 목적: 루트 페이지(pracexam.com) 하나로 "미국=영어, 한국=한글" 자동 분기.
//  - 한국 노출면(네이버 Yeti 봇 / 카카오톡 공유 스크래퍼 / 한국어 브라우저)
//    → <title>·description·og·twitter 를 한글로 교체
//  - 그 외(구글·페이스북·미국 사용자) → HTML 원본(영어) 그대로
// 봇이 받는 값 = 같은 언어 사용자가 받는 값이므로 클로킹(cloaking) 아님.
// ---------------------------------------------------------------------------

const KO_TITLE = "미국세무사(EA) 문제은행 · 한글 해설 5,000문항 | PracExam";
const KO_DESC  = "미국세무사(EA) 시험 대비 실전 문제 5,000+. Part 1·2·3 전 영역, 모든 문항에 한국어·영어 해설. 최신 세법 기준 온라인 문제은행.";

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
  element(el) { el.setInnerContent(KO_TITLE); }
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
function isRoot(url) {
  const p = url.pathname;
  return p === "/" || p === "/index.html";
}

export async function onRequest(context) {
  const { request, next } = context;
  const response = await next();

  // HTML 응답에만 적용
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return response;

  // 루트가 아니면 손대지 않는다 (위 설명 참조)
  if (!isRoot(new URL(request.url))) return response;

  // 영어권이면 원본 그대로 반환
  if (!wantsKorean(request)) return response;

  // UA/언어별로 응답이 달라지므로 캐시가 뒤섞이지 않도록 Vary 지정
  const rewritten = new HTMLRewriter()
    .on("title",                            new TitleRewriter())
    .on('meta[name="description"]',         new MetaRewriter(KO_DESC))
    .on('meta[property="og:title"]',        new MetaRewriter(KO_TITLE))
    .on('meta[property="og:description"]',  new MetaRewriter(KO_DESC))
    .on('meta[property="og:locale"]',       new MetaRewriter("ko_KR"))
    .on('meta[property="og:locale:alternate"]', new MetaRewriter("en_US"))
    .on('meta[name="twitter:title"]',       new MetaRewriter(KO_TITLE))
    .on('meta[name="twitter:description"]', new MetaRewriter(KO_DESC))
    .transform(response);

  const out = new Response(rewritten.body, rewritten);
  out.headers.append("Vary", "User-Agent, Accept-Language");
  return out;
}
