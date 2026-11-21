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
const KO_TITLE = "미국 세무사 · EA 시험 준비의 새로운 기준 | PracExam";
const KO_DESC  = "차세대 시험 준비 플랫폼. 미국 세무사, Enrolled Agent · EA 시험 실전 문제 5,000+. Part 1·2·3 전 영역, 전 문항 한국어·영어 해설. 최신 세법 기준 EA 시험 온라인 문제은행.";  // 78자

// 🆕 2026-10-24 — 루트가 «중립 허브»가 되고 EA 는 /ea/ 로 옮겼다. 위 EA 제목·설명은 /ea/ 가 그대로 이어받고(순위 신호 유지),
//    허브(/)와 부동산(/re/)은 아래 자기 제목을 쓴다. 글자 수 기준(제목 40자 · 설명 80자)은 같다.
const KO_HUB_TITLE = "PracExam | 미국 세무사 · EA, 부동산 시험 준비의 새로운 기준";
const KO_HUB_DESC  = "차세대 시험 준비 플랫폼. 미국 세무사, Enrolled Agent · EA 시험과 미국 부동산 중개인, 라이센스, 에이전트, Real Estate License 시험 실전 문제은행. 시험을 고르고 바로 연습하세요.";
const KO_RE_TITLE  = "미국 부동산 중개인, 라이센스, 에이전트 시험 준비의 새로운 기준 | PracExam";
const KO_RE_DESC   = "차세대 시험 준비 플랫폼. 미국 부동산 중개인, 라이센스, 에이전트, Real Estate License, Broker 시험 실전 문제. National과 주별 문제, 캘리포니아·워싱턴주·텍사스·일리노이·조지아·플로리다·버지니아·뉴저지·뉴욕. California, Washington, Texas, Illinois, Georgia, Florida, Virginia, New Jersey, New York. 문항별 해설과 시험 팁.";

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


// ---------------------------------------------------------------------------
// 🆕 2026-10-24 — TEST DOMAIN GATE (boss: dxdgroup.com 에 몇 주 올려 라이브 테스트, 비밀번호 하나로 잠금)
//  - Runs ONLY when the host is test.pracexam.com (was test.dxdgroup.com until 2026-11-12). pracexam.com and *.pages.dev are untouched,
//    so this file can move to pracexam.com as is.
//  - One password -> a cookie for 30 days. Every response on the test host also gets «noindex» so search
//    engines never list a copy of pracexam.com (duplicate content would hurt pracexam.com SEO).
//  - Only the SHA-256 of the password is in this public repo. A Cloudflare env var GATE_PASSWORD_SHA256 overrides it.
// ---------------------------------------------------------------------------
const GATE_HOST_RE = /^test\.pracexam\.com$/i;   // 2026-11-12: test site moved to test.pracexam.com; test.dxdgroup.com retired (apex pracexam.com never matches)
const GATE_DEFAULT_SHA256 = "bdff1fb817fce0908117140656e4c3ee1077ba44c4d4fa41679996f328424b0e";
const GATE_COOKIE = "pe_test_gate";

async function sha256hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}
function gateCookie(request) {
  const m = (request.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + GATE_COOKIE + "=([a-f0-9]{64})"));
  return m ? m[1] : "";
}
function gatePage(wrong) {
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex,nofollow"><title>PracExam test site</title>'
    + '<style>:root{--bg:#FBFAF7;--ink:#1C2326;--mid:#5A6468;--line:#E6E3DC}'
    + '@media (prefers-color-scheme:dark){:root{--bg:#121A1C;--ink:#E4EBEC;--mid:#A9B6B8;--line:#2E3B3E}}'
    + 'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--ink);font:16px/1.5 Inter,system-ui,sans-serif;padding:16px}'
    + 'form{width:100%;max-width:340px;border:1px solid var(--line);border-radius:14px;padding:28px 24px;background:rgba(255,255,255,.03)}'
    + 'h1{font-size:20px;margin:0 0 6px}p{margin:0 0 16px;color:var(--mid);font-size:14px}'
    + 'input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid var(--line);border-radius:9px;font:inherit;background:transparent;color:inherit}'
    + 'button{width:100%;margin-top:12px;padding:12px;border:0;border-radius:10px;background:var(--ink);color:var(--bg);font:600 15px Inter,system-ui,sans-serif;cursor:pointer}'
    + '.e{color:#dc2626;font-size:13px;margin:10px 0 0}</style></head><body>'
    + '<form method="post" action="/__gate"><h1>PracExam test site</h1><p>Enter the password to continue.</p>'
    + '<input type="password" name="pw" autocomplete="current-password" autofocus aria-label="Password">'
    + '<input type="hidden" name="next" value="">'
    + '<button type="submit">Enter</button>' + (wrong ? '<p class="e">Wrong password.</p>' : '') + '</form>'
    + '<script>document.querySelector("[name=next]").value=location.pathname+location.search+location.hash;</script></body></html>';
  return new Response(html, { status: wrong ? 401 : 200, headers: {
    "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
async function testGate(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (!GATE_HOST_RE.test(url.hostname)) return null;                       // not the test domain: no gate
  if (url.pathname === "/robots.txt")
    return new Response("User-agent: *\nDisallow: /\n", { headers: { "content-type": "text/plain", "X-Robots-Tag": "noindex" } });
  const want = (env && env.GATE_PASSWORD_SHA256) || GATE_DEFAULT_SHA256;
  if (url.pathname === "/__gate" && request.method === "POST") {
    const form = await request.formData();
    const ok = (await sha256hex(String(form.get("pw") || ""))) === want;
    if (!ok) return gatePage(true);
    let next = String(form.get("next") || "/");
    if (!next.startsWith("/") || next.startsWith("//")) next = "/";
    return new Response(null, { status: 303, headers: {
      "location": next, "cache-control": "no-store",
      "set-cookie": GATE_COOKIE + "=" + want + "; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax" } });
  }
  if (gateCookie(request) !== want) return gatePage(false);
  return "pass";
}
async function withNoindex(next) {
  const r = await next();
  const out = new Response(r.body, r);
  out.headers.set("X-Robots-Tag", "noindex, nofollow");
  return out;
}

async function handle(context) {
  const { request, next } = context;
  const gate = await testGate(context);
  if (gate && gate !== "pass") return gate;
  const response = gate === "pass" ? await withNoindex(next) : await next();
  
    const _url = new URL(request.url);

  // 🆕 2026-09-12 — AI 답변엔진(Perplexity 등)이 로그인 화면(/app)을 "제품 소개"로
  // 착각해 인용한 사고 뒤 조치. 로그인 화면·관리자 화면은 검색·AI 색인에서 제외한다.
  const NOINDEX_PATHS = ["/app", "/app.html", "/re/app", "/re/app.html", "/review", "/admin"];   // /re/app added 2026-10-31 (V2: the RE app is live)
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
    .on(new URL(request.url).pathname === "/" ? "[data-ko]" : "[data-ko-none]", new DataKoSwap())
    .transform(response);

  const out = new Response(rewritten.body, rewritten);
  out.headers.append("Vary", "User-Agent, Accept-Language");
  return out;
}

// 2026-10-31 (boss): Korean entry URLs for Korean search. /ko/ · /ea/ko/ · /re/ko/ · /re/exam-tips/ko/ serve the SAME page as
// the English URL, already switched to Korean (html lang, title, description, canonical). Nothing about the page itself changes:
// the KO/EN toggle still works in place. Both URLs carry hreflang pairs (static <link rel="alternate"> in each page).
const KO_TIPS_RE_TITLE = "미국 부동산 중개인, 라이센스, 에이전트, Real Estate License 시험 안내 · 주별 응시 요건 | PracExam";
const KO_TIPS_RE_DESC  = "미국 부동산 중개인, 라이센스, 에이전트, Real Estate License 시험 주별 안내. 캘리포니아·워싱턴주·텍사스·일리노이·조지아·플로리다·버지니아·뉴저지·뉴욕 응시 요건, 시험 형식, 비용과 다음 단계.";
const KO_TIPS_EA_TITLE = "미국 세무사, Enrolled Agent · EA 시험 안내 · 응시 자격·형식 | PracExam";
const KO_TIPS_EA_DESC  = "미국 세무사, Enrolled Agent · EA 시험 안내. 응시 자격, 시험 형식과 비용, 시험 당일 준비, 합격 후 등록 절차까지 한눈에 정리했습니다.";
// 2026-11-05 (boss): SEO and AEO both use 라이센스. On the Korean URLs the structured data is Korean too.
// The RE FAQ is the visible Korean FAQ in re/index.html word for word: keep the two in step.
// 2026-11-13: EA customer reviews page (Korean view shows Korean and English reviews).
const KO_REVIEWS_EA_TITLE = "미국 세무사, EA 시험 준비 고객 후기 | PracExam";
const KO_REVIEWS_EA_DESC  = "PracExam으로 미국 세무사, Enrolled Agent · EA 시험을 준비하신 분들의 후기입니다. 학습에 도움이 된 점과 새로 시작하는 분들을 위한 조언을 담았습니다.";
const KO_LD_RE_FAQ = "{\"@context\": \"https://schema.org\", \"@type\": \"FAQPage\", \"inLanguage\": \"ko\", \"mainEntity\": [{\"@type\": \"Question\", \"name\": \"미국 부동산 라이센스, Real Estate License 시험이란 무엇인가요?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"미국에서 부동산 거래를 중개하려면 주 정부가 발급하는 라이센스가 필요합니다. 라이센스를 받으려면 시험에 합격해야 하고, 시험은 모든 주에 공통인 National 부분과 각 주의 법을 다루는 State 부분으로 나뉘는 경우가 많습니다.\"}}, {\"@type\": \"Question\", \"name\": \"주마다 시험이 다른가요?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"네. 라이센스 요건과 시험 형식은 주마다 다릅니다. PracExam이 지원하는 주와 주별 요건은 시험 안내 페이지에서 확인하실 수 있습니다.\"}}, {\"@type\": \"Question\", \"name\": \"부동산 에이전트, Real Estate Agent와 브로커, Broker는 어떻게 다른가요?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"일반적으로 에이전트는 브로커 밑에서 일하고, 브로커 라이센스는 독립적으로 중개업을 운영할 수 있는 상위 라이센스입니다. 세부 요건은 주마다 다릅니다.\"}}, {\"@type\": \"Question\", \"name\": \"한국어 해설로 공부할 수 있나요?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"네. PracExam의 모든 문제에 한국어와 영어 해설이 함께 있고, War Room의 이론 공부도 한글과 영어로 할 수 있어서 이해에 큰 도움이 됩니다. 한국어 해설로 쉽게 이해하고 영어 용어도 함께 익히실 수 있습니다.\"}}]}";
const KO_LD_RE_COURSE = JSON.stringify({ "@context": "https://schema.org", "@type": "Course", "inLanguage": "ko",
  name: "미국 부동산 라이센스, Real Estate License 시험 문제", description: KO_RE_DESC, url: "https://pracexam.com/re/ko/",
  provider: { "@type": "Organization", name: "PracExam", url: "https://pracexam.com/" },
  about: ["미국 부동산 라이센스 시험", "Real Estate License Exam"] });
const KO_LD_HUB_FAQ = "{\"@context\": \"https://schema.org\", \"@type\": \"FAQPage\", \"inLanguage\": \"ko\", \"mainEntity\": [{\"@type\": \"Question\", \"name\": \"PracExam은 무엇인가요?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"PracExam은 두 가지 미국 자격시험을 위한 온라인 문제 은행입니다. 미국 세무사 · EA 시험과 미국 부동산 라이센스, Real Estate License 시험을 다룹니다. 모든 문제에 자세한 해설과 시험 팁이 있습니다.\"}}, {\"@type\": \"Question\", \"name\": \"어떤 시험을 다루나요?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"미국 세무사 · EA 시험 Part 1, 2, 3은 https://pracexam.com/ea/ko/ 에서, 미국 부동산 라이센스 시험의 National 부분과 State 부분은 https://pracexam.com/re/ko/ 에서 공부할 수 있습니다.\"}}, {\"@type\": \"Question\", \"name\": \"PracExam 요금은 얼마인가요?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"30일 무료 체험(하루 10문제)으로 시작할 수 있습니다. Pro는 월 $29 또는 3개월 $70이고, 14일 환불과 언제든 해지가 가능합니다. 시험별로 따로 구독합니다.\"}}, {\"@type\": \"Question\", \"name\": \"모의고사가 포함되어 있나요?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"네. Pro에는 실전 형식의 전체 모의고사와 토픽별 학습, Smart Study 모드, 토픽별 War Room 페이지가 포함됩니다.\"}}]}";
const KO_ROUTES = {
  "/ko/":              { base: "/",              title: KO_HUB_TITLE,     desc: KO_HUB_DESC, ld: { "hub-faq": KO_LD_HUB_FAQ } },
  "/ea/ko/":           { base: "/ea/",           title: KO_TITLE,         desc: KO_DESC },
  "/re/ko/":           { base: "/re/",           title: KO_RE_TITLE,      desc: KO_RE_DESC, heroes: [["/re/img/hero-re-ca.webp?v=d9c28d9778", "야자수와 선인장이 있는 스페인풍 집 앞에서 태블릿을 들고 안내하는 부동산 에이전트"], ["/re/img/hero-re-ko2.webp?v=b5707c2779", "벽돌집 앞에 팔짱을 끼고 서 있는 부동산 에이전트"], ["/re/img/hero-re-3.webp?v=134ab7aea3", "집 현관 앞에서 태블릿을 든 부동산 에이전트"], ["/re/img/hero-re-ny.webp?v=efc80208d2", "뉴욕 브라운스톤 건물 앞에 서 있는 부동산 에이전트"]], ld: { "re-faq": KO_LD_RE_FAQ, "re-course": KO_LD_RE_COURSE } },
  "/re/exam-tips/ko/": { base: "/re/exam-tips/", title: KO_TIPS_RE_TITLE, desc: KO_TIPS_RE_DESC },
  "/ea/exam-tips/ko/": { base: "/ea/exam-tips/", title: KO_TIPS_EA_TITLE, desc: KO_TIPS_EA_DESC },
  "/ea/reviews/ko/":   { base: "/ea/reviews/",   title: KO_REVIEWS_EA_TITLE, desc: KO_REVIEWS_EA_DESC },
};
const KO_REDIRECT = { "/ko": "/ko/", "/ea/ko": "/ea/ko/", "/re/ko": "/re/ko/", "/re/exam-tips/ko": "/re/exam-tips/ko/", "/ea/exam-tips/ko": "/ea/exam-tips/ko/", "/ea/reviews/ko": "/ea/reviews/ko/" };
// 2026-11-05: the hub (/) keeps its Korean in data-ko attributes and fills it in with JS. Crawlers that do not run JS
// (Naver Yeti) therefore saw English body text on /ko/. For the Korean hub, write the Korean text into the HTML itself.
class DataKoSwap {
  element(el) { const v = el.getAttribute("data-ko"); if (v !== null) el.setInnerContent(v); }
}
class LdSwap {
  constructor(ld) { this.ld = ld || {}; }
  element(el) { const v = this.ld[el.getAttribute("data-ld")]; if (v) el.setInnerContent(v, { html: true }); }
}
class AttrSetter {
  constructor(name, value) { this.name = name; this.value = value; }
  element(el) { el.setAttribute(this.name, this.value); }
}
// 2026-11-14 (boss): the Korean RE main page rotates the hero photos of the CA, TX, NJ and NY Korean state pages, in that order.
// The /re/ page has three <img> in #hero-rot: the first gets src, the rest get data-src (loaded after page load), extra photos are
// added after the third, and unused ones are removed. The rotation script counts the photos itself.
class HeroKo {
  constructor(route) { this.r = route; this.n = 0; }
  element(el) {
    const list = this.r.heroes;
    if (!list || !list.length) return;
    this.n += 1;
    const h = list[this.n - 1];
    if (!h) { el.remove(); return; }
    if (this.n === 1) { el.setAttribute("src", h[0]); el.setAttribute("alt", h[1]); }
    else { el.setAttribute("data-src", h[0]); el.setAttribute("alt", h[1]); }
    if (this.n === 3 && list.length > 3) {
      const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
      el.after(list.slice(3).map((x) => '<img class="hero-photo" data-src="' + esc(x[0]) + '" width="1200" height="800" alt="' + esc(x[1]) + '" loading="lazy">').join(""), { html: true });
    }
  }
}
async function koRoute(context, route) {
  const url = new URL(context.request.url);
  const kourl = url.origin + url.pathname;
  const baseUrl = new URL(route.base + url.search, url.origin);
  const baseReq = new Request(baseUrl.toString(), context.request);
  const ctx = Object.assign({}, context, { request: baseReq, next: () => context.env.ASSETS.fetch(baseReq) });
  const response = await handle(ctx);
  const ct = (response && response.headers.get("content-type")) || "";
  if (!ct.includes("text/html") || response.status !== 200) return response;
  const out = new HTMLRewriter()
    .on("html",                                  new AttrSetter("lang", "ko"))
    .on("html",                                  new AttrSetter("class", "lang-ko"))
    .on("head", { element(el) { el.prepend("<script>try{localStorage.setItem('ea_lang','ko')}catch(e){}</script>", { html: true }); } })
    .on("title",                                 new TitleRewriter(route.title))
    .on('meta[name="description"]',              new MetaRewriter(route.desc))
    .on('meta[property="og:title"]',             new MetaRewriter(route.title))
    .on('meta[property="og:description"]',       new MetaRewriter(route.desc))
    .on('meta[property="og:url"]',               new MetaRewriter(kourl))
    .on('meta[property="og:locale"]',            new MetaRewriter("ko_KR"))
    .on('meta[property="og:locale:alternate"]',  new MetaRewriter("en_US"))
    .on('meta[name="twitter:title"]',            new MetaRewriter(route.title))
    .on('meta[name="twitter:description"]',      new MetaRewriter(route.desc))
    .on('link[rel="canonical"]',                 new AttrSetter("href", kourl))
    .on(route.base === "/" ? "[data-ko]" : "[data-ko-none]", new DataKoSwap())
    .on("script[data-ld]",                       new LdSwap(route.ld))
    .on("#hero-rot img",                         new HeroKo(route))
    .transform(response);
  const res = new Response(out.body, out);
  res.headers.delete("Vary");
  return res;
}

// 2026-11-14: published EA reviews are written into the HTML of /ea/reviews/ (and /ko/) on the server, so search engines and
// AI answer engines read them without running JS. ea/reviews.js re-renders the same list on load. On any error the page is
// served untouched (the JS still shows the reviews). English page = English reviews only; Korean page = all.
const RV_URL  = "https://ufrhvodruulpgnmudzwh.supabase.co/rest/v1/public_reviews?exam=eq.ea&select=id,name,state,lang,subscriber,passed,helped,advice,date,featured,helped_en,advice_en";
const RV_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcmh2b2RydXVscGdubXVkendoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTgyOTYsImV4cCI6MjA5NzU3NDI5Nn0.evW9GggJ2saXHgZah1SRQvSdle7AC5esAnrmpbm5jb8";
function rvEsc(x) { return String(x == null ? "" : x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function rvKey(r) { return "rv-" + String(r.id || (String(r.name || "") + "-" + String(r.date || ""))).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function rvCard(r, en) {
  const p = (r.passed || []).filter(n => n >= 1 && n <= 3).sort();
  const m = /^(\d{4})-(\d{2})/.exec(r.date || "");
  const meta = [r.subscriber ? "Verified Subscriber" : "Verified User", r.state ? rvEsc(r.state) : "", m ? m[1] + "." + m[2] : ""].filter(Boolean).join(" · ");
  const tr = en && r.lang === "ko" && r.helped_en;
  const lang = tr ? "en" : (r.lang === "ko" ? "ko" : "en");
  const h = tr ? r.helped_en : r.helped, a = tr ? r.advice_en : r.advice;
  return '<article id="' + rvKey(r) + '" class="rv-card" data-lang="' + (tr ? "both" : lang) + '" lang="' + lang + '">'
    + '<p class="rv-text"><span class="rv-q" aria-hidden="true">&ldquo;</span>' + rvEsc(h) + "</p>"
    + (a ? '<p class="rv-advice"><b>To Future EAs:</b> ' + rvEsc(a) + "</p>" : "")
    + (tr ? '<p class="rv-tr">Translated from Korean</p>' : "")
    + '<div class="rv-foot"><span class="rv-name">' + rvEsc(r.name) + "</span>"
    + (p.length ? '<span class="rv-pass"><img src="/check-mark.png" alt="" width="14" height="14">Part ' + p.join("·") + "</span>" : "")
    + '<span class="rv-meta">' + meta + "</span></div></article>";
}
async function rvRows() {
  try {
    const r = await fetch(RV_URL, { headers: { apikey: RV_ANON, Authorization: "Bearer " + RV_ANON }, cf: { cacheTtl: 300, cacheEverything: true } });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) ? rows : null;
  } catch (e) { return null; }
}
async function injectReviews(response, ko) {
  const ct = (response && response.headers.get("content-type")) || "";
  if (!ct.includes("text/html") || response.status !== 200) return response;
  let rows = await rvRows();
  if (!rows || rows.length < 3) return response;   // same 3-review rule as ea/reviews.js
  if (!ko) rows = rows.filter(r => r.lang !== "ko" || r.helped_en);
  rows.sort((a, b) => (!!b.featured !== !!a.featured) ? (b.featured ? 1 : -1) : String(b.date || "").localeCompare(String(a.date || "")));
  if (!rows.length) return response;
  const html = rows.map(r => rvCard(r, !ko)).join("");
  return new HTMLRewriter()
    .on("#rv-all", { element(el) { el.setInnerContent(html, { html: true }); } })
    .on("#rv-empty", { element(el) { el.setAttribute("hidden", ""); } })
    .on('meta[name="robots"]', { element(el) { el.remove(); } })   // indexable once 3+ reviews are published
    .transform(response);
}

// 2026-11-14 (boss): until 3 English reviews are published, links to the reviews page are taken out of the EA menus
// (the page would be empty). Checked on the server with the same cached public_reviews call; on error the links stay.
const RV_LINK_PAGES = /^\/(ea\/(?!reviews\/)|tips\/|popquiz|videos)/;
async function hideReviewLinks(response) {
  const rows = await rvRows();
  if (!rows || rows.length >= 3) return response;
  return new HTMLRewriter()
    .on('a[href="/ea/reviews/"], a[href="/ea/reviews/ko/"]', { element(el) { el.remove(); } })
    .transform(response);
}

// 2026-11-16 (boss): IRS Tax Tips weekly summary on the web, KO + EN, one URL per week.
//   /ea/irs-news/            English list        /ea/irs-news/ko/            Korean list
//   /ea/irs-news/2026-11-16/ English issue       /ea/irs-news/ko/2026-11-16/ Korean issue
//   /ea/irs-news/rss.xml     English RSS         /ea/irs-news/ko/rss.xml     Korean RSS (for Facebook auto-post)
// The articles are saved by the send-irs-news edge function (table irs_news_issues, read here through the anon view
// public_irs_news). Every page is written on the server from the template ea/irs-news/index.html, so search engines and
// AI answer engines read the full text without running JS. On a read error the list shows «coming soon» (never a 500).
const NW_URL = "https://ufrhvodruulpgnmudzwh.supabase.co/rest/v1/public_irs_news?select=lang,slug,issue_date,subject,html,created_at,updated_at&order=slug.desc&limit=500";
const NW_BASE = "https://pracexam.com/ea/irs-news/";
const NW_TXT = {
  en: {
    listTitle: "IRS Tax Tips Weekly Summary | PracExam",
    listDesc: "A plain-English weekly summary of the latest IRS Tax Tips, with a link to each original IRS article. From PracExam, the EA exam prep site.",
    h1: "IRS Tax Tips Weekly Summary",
    lead: "Every week we summarize the latest IRS Tax Tips in plain English. Each article links to the original on IRS.gov.",
    empty: "The first weekly summary is coming soon.",
    eyebrow: "IRS TAX TIPS",
    home: "&larr; EA home", homeHref: "/ea/",
    all: "&larr; All weekly summaries", more: "See all weekly summaries",
    note: "This is a PracExam summary of IRS Tax Tips for study and general information. It is not an official IRS publication or tax advice. Each article links to the original on IRS.gov.",
    ctaH: "Preparing for the EA exam?",
    ctaP: "Practice real exam-style questions with full explanations. Sign up and practice 10 free questions a day for 30 days. No credit card needed.",
    ctaB: "Start Free", ctaHref: "/app",
    week: "Week of ", sep: " · ",
    rssTitle: "PracExam IRS Tax Tips Weekly Summary (English)", locale: "en_US"
  },
  ko: {
    listTitle: "IRS Tax Tip 한국어판 · 주간 정리 | PracExam",
    listDesc: "IRS가 매주 발행하는 Tax Tip을 쉬운 한국어로 정리한 주간 소식입니다. 기사마다 IRS.gov 원문 링크가 있습니다. 미국 세무사, EA 시험 준비 PracExam.",
    h1: "IRS Tax Tip 한국어판 · 주간 정리",
    lead: "IRS가 매주 발행하는 Tax Tip을 쉬운 한국어로 정리했습니다. 기사마다 IRS.gov 원문 링크가 있습니다.",
    empty: "첫 주간 정리가 곧 올라옵니다.",
    eyebrow: "IRS Tax Tip 한국어판",
    home: "&larr; EA 홈으로", homeHref: "/ea/ko/",
    all: "&larr; 전체 목록", more: "지난 주간 정리 모두 보기",
    note: "이 글은 IRS Tax Tip을 PracExam이 공부와 일반 정보 제공을 위해 한국어로 정리한 것입니다. IRS의 공식 간행물이나 세무 자문이 아닙니다. 기사마다 IRS.gov 원문 링크가 있습니다.",
    ctaH: "미국 세무사, EA 시험을 준비하고 계신가요?",
    ctaP: "실제 시험과 같은 형식의 문제를 한국어와 영어 해설로 공부하세요. 가입 후 30일 동안 매일 10문제를 무료로 풀어 보세요. 신용카드 등록 없이 바로 이용할 수 있습니다.",
    ctaB: "무료로 시작하기", ctaHref: "/app",
    week: "", sep: " · ",
    rssTitle: "PracExam IRS Tax Tip 한국어판 주간 정리", locale: "ko_KR"
  }
};
function nwEsc(x) { return String(x == null ? "" : x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function nwText(h) { return String(h || "").replace(/<[^>]+>/g, " ").replace(/&middot;/g, "·").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim(); }
// Our own HTML from the weekly routine; still drop anything that could run.
function nwClean(h) { return String(h || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<(iframe|object|embed|form)[\s\S]*?<\/\1>/gi, "").replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/javascript:/gi, ""); }
// Article titles = each <h2> that follows an «IRS TAX TIP ...» label line (skips the digest heading).
function nwTitles(h) {
  const out = [], re = /IRS TAX TIP[^<]*<\/p>\s*<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m; while ((m = re.exec(h || ""))) out.push(nwText(m[1]));
  return out;
}
function nwSources(h) {
  const out = [], re = /href="(https?:\/\/(?:www\.)?irs\.gov[^"]*)"/gi;
  let m; while ((m = re.exec(h || ""))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
  return out;
}
function nwUrl(lang, slug) { return NW_BASE + (lang === "ko" ? "ko/" : "") + (slug ? slug + "/" : ""); }
function nwPath(lang, slug) { return "/ea/irs-news/" + (lang === "ko" ? "ko/" : "") + (slug ? slug + "/" : ""); }
function nwHeadline(r, L) {
  const t = nwTitles(r.html);
  if (t.length === 1) return t[0];
  if (t.length > 1) return t.join(" · ");
  return nwText(r.subject).replace(/^(\[[^\]]*\]\s*)+/, "");
}
async function nwRows() {
  try {
    const r = await fetch(NW_URL, { headers: { apikey: RV_ANON, Authorization: "Bearer " + RV_ANON }, cf: { cacheTtl: 300, cacheEverything: true } });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) ? rows : null;
  } catch (e) { return null; }
}
function nwRss(rows, lang) {
  const L = NW_TXT[lang];
  const items = rows.filter(r => r.lang === lang).slice(0, 30).map(function (r) {
    const link = nwUrl(lang, r.slug);
    const d = new Date(r.issue_date + "T15:00:00Z").toUTCString();
    const titles = nwTitles(r.html);
    return "<item><title>" + nwEsc(nwHeadline(r, L)) + "</title><link>" + link + "</link><guid isPermaLink=\"true\">" + link + "</guid>"
      + "<pubDate>" + d + "</pubDate><description>" + nwEsc((lang === "ko" ? "이번 주 IRS Tax Tip을 쉬운 한국어로 정리했습니다." : "This week's IRS Tax Tips in plain English:") + "\n" + (titles.length ? titles : [nwText(r.subject)]).map(x => "• " + x).join("\n")) + "</description>"
      + "<content:encoded><![CDATA[" + nwClean(r.html).replace(/\]\]>/g, "]]&gt;") + "]]></content:encoded></item>";
  }).join("");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom"><channel>'
    + "<title>" + nwEsc(L.rssTitle) + "</title><link>" + nwUrl(lang, "") + "</link>"
    + '<atom:link href="' + nwUrl(lang, "") + 'rss.xml" rel="self" type="application/rss+xml"/>'
    + "<description>" + nwEsc(L.listDesc) + "</description><language>" + (lang === "ko" ? "ko" : "en-us") + "</language>"
    + items + "</channel></rss>";
}
// Study Tips articles, read from the static /tips/ (or /tips/ko/) list page: lead card + rows, in page order.
async function nwTips(context, lang) {
  try {
    const r = await context.env.ASSETS.fetch(new Request(new URL(lang === "ko" ? "/tips/ko/" : "/tips/", context.request.url).toString()));
    if (!r.ok) return [];
    const t = await r.text(), out = [];
    const re = /<a class="nl-(?:lead|row)" href="(\/tips\/[^"]+)">([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(t))) {
      const ti = /class="nl-[a-z]*title">([\s\S]*?)<\//.exec(m[2]), w = /nl-when">([^<]*)/.exec(m[2]);
      const dk = /class="nl-[a-z]*dek">([\s\S]*?)<\/p>/.exec(m[2]);
      if (ti) out.push({ href: m[1], title: nwText(ti[1]), when: w ? nwText(w[1]).replace(/\s*·.*$/, "") : "", dek: dk ? nwText(dk[1]) : "" });
    }
    return out;
  } catch (e) { return []; }
}
function nwSitemap(rows) {
  const by = {};
  rows.forEach(r => { (by[r.slug] = by[r.slug] || {})[r.lang] = r; });
  const alt = (slug, has) => ["en", "ko"].filter(l => has[l]).map(l => '<xhtml:link rel="alternate" hreflang="' + l + '" href="' + nwUrl(l, slug) + '"/>').join("");
  let out = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';
  const last = rows.length ? String(rows[0].updated_at || rows[0].issue_date).slice(0, 10) : "";
  ["en", "ko"].forEach(l => { out += "<url><loc>" + nwUrl(l, "") + "</loc>" + (last ? "<lastmod>" + last + "</lastmod>" : "") + alt("", { en: 1, ko: 1 }) + "</url>"; });
  Object.keys(by).sort().reverse().forEach(slug => {
    ["en", "ko"].forEach(l => {
      const r = by[slug][l]; if (!r) return;
      out += "<url><loc>" + nwUrl(l, slug) + "</loc><lastmod>" + String(r.updated_at || r.issue_date).slice(0, 10) + "</lastmod>" + alt(slug, by[slug]) + "</url>";
    });
  });
  return out + "</urlset>";
}
async function irsNews(context, p) {
  const url = new URL(context.request.url);
  const lang = p.startsWith("/ea/irs-news/ko/") ? "ko" : "en";
  const rest = p.slice(lang === "ko" ? "/ea/irs-news/ko/".length : "/ea/irs-news/".length);
  const L = NW_TXT[lang];
  if (lang === "en" && rest === "sitemap.xml") {
    const rows = (await nwRows()) || [];
    return new Response(nwSitemap(rows), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  if (rest === "rss.xml") {
    const rows = (await nwRows()) || [];
    return new Response(nwRss(rows, lang), { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" } });
  }
  let slug = "";
  if (rest !== "") {
    const m = /^(\d{4}-\d{2}-\d{2})\/?$/.exec(rest);
    if (!m) return Response.redirect(new URL(nwPath(lang, ""), url).toString(), 301);
    if (!rest.endsWith("/")) return Response.redirect(new URL(nwPath(lang, m[1]), url).toString(), 301);
    slug = m[1];
  }
  const rows = await nwRows();
  const mine = (rows || []).filter(r => r.lang === lang);
  const row = slug ? mine.find(r => r.slug === slug) : null;
  if (slug && rows && !row) {
    // no issue in this language for that week: send the reader to the list (other language may exist)
    return Response.redirect(new URL(nwPath(lang, ""), url).toString(), 302);
  }
  // template through the normal handler (test gate, noindex on the test host)
  const tplReq = new Request(new URL("/ea/irs-news/", url.origin).toString(), context.request);
  const ctx = Object.assign({}, context, { request: tplReq, next: () => context.env.ASSETS.fetch(tplReq) });
  const response = await handle(ctx);
  const ct = (response && response.headers.get("content-type")) || "";
  if (!ct.includes("text/html") || response.status !== 200) return response;

  const other = lang === "ko" ? "en" : "ko";
  const otherHas = slug ? (rows || []).some(r => r.lang === other && r.slug === slug) : true;
  const selfUrl = nwUrl(lang, slug);
  const enUrl = nwUrl("en", (lang === "en" || otherHas) ? slug : "");
  const koUrl = nwUrl("ko", (lang === "ko" || otherHas) ? slug : "");
  let title, desc, main, ld, robots = "", back = null;
  if (row) {
    const head = nwHeadline(row, L);
    const titles = nwTitles(row.html);
    title = (lang === "ko" ? "IRS Tax Tip 한국어판 " : "IRS Tax Tips ") + row.slug + ": " + head;
    if (title.length > 110) title = title.slice(0, 107) + "...";
    title += " | PracExam";
    desc = (lang === "ko" ? "IRS Tax Tip 한국어 정리 (" + row.slug + "): " : "Plain-English summary of IRS Tax Tips (" + row.slug + "): ") + (titles.length ? titles.join(" · ") : head);
    if (desc.length > 300) desc = desc.slice(0, 297) + "...";
    back = { href: nwPath(lang, ""), label: lang === "ko" ? "&larr; IRS Tax Tip · Study Tips" : "&larr; IRS Tax Tips · Study Tips" };
    main = '<div class="nw-page">'
      + '<article class="nw-article" lang="' + lang + '">' + nwClean(row.html) + "</article>"
      + '<p class="nw-note">' + nwEsc(L.note) + "</p>"
      + '<div class="nw-cta"><h2>' + nwEsc(L.ctaH) + "</h2><p>" + nwEsc(L.ctaP) + '</p><a class="btn btn-primary btn-lg" href="' + L.ctaHref + '">' + nwEsc(L.ctaB) + "</a></div>"
      + '<p class="nw-more"><a href="' + nwPath(lang, "") + '">' + nwEsc(L.more) + " &rarr;</a></p></div>";
    ld = { "@context": "https://schema.org", "@type": "Article", headline: head.slice(0, 110), description: desc, inLanguage: lang,
      datePublished: row.issue_date, dateModified: String(row.updated_at || row.created_at || row.issue_date).slice(0, 10),
      url: selfUrl, mainEntityOfPage: selfUrl, image: "https://pracexam.com/og-taxtip-" + lang + ".jpg?v=20261116c",
      author: { "@type": "Organization", name: "PracExam", url: "https://pracexam.com/" },
      publisher: { "@type": "Organization", name: "PracExam", url: "https://pracexam.com/", logo: { "@type": "ImageObject", url: "https://pracexam.com/apple-touch-icon.png" } },
      isBasedOn: nwSources(row.html), about: ["IRS Tax Tips", "Enrolled Agent exam"] };
  } else {
    title = L.listTitle; desc = L.listDesc;
    // 2026-11-16 (boss): menu «IRS 뉴스 · Study Tips» lands here. One column: the latest 3 weekly issues as cards,
    // older weeks as a short link list, then Study Tips cards below. (A side column was tried and rejected: unbalanced.)
    if (!mine.length) robots = "noindex";
    const K = lang === "ko";
    const card = r => {
      const ts = nwTitles(r.html);
      return '<a class="nw-card" href="' + nwPath(lang, r.slug) + '"><span class="nw-date">' + nwEsc(r.slug) + (K ? " 주간 정리" : " weekly summary") + "</span>"
        + (ts.length ? '<ul class="nw-card-titles">' + ts.map(x => "<li>" + nwEsc(x) + "</li>").join("") + "</ul>" : '<span class="nw-title">' + nwEsc(nwHeadline(r, L)) + "</span>")
        + '<p class="nw-card-dek">' + nwEsc(nwSnippet(r.html, 180)) + '</p><span class="nw-card-go">' + (K ? "읽기" : "Read") + " &rarr;</span></a>";
    };
    const news = mine.length
      ? '<div class="nw-grid">' + mine.slice(0, 3).map(card).join("") + "</div>"
        + (mine.length > 3 ? '<div class="nw-older"><h3>' + (K ? "지난 주간 정리" : "Earlier weeks") + "</h3><ul>"
          + mine.slice(3).map(r => '<li><a href="' + nwPath(lang, r.slug) + '"><span class="nw-date">' + nwEsc(r.slug) + "</span>" + nwEsc(nwHeadline(r, L)) + "</a></li>").join("") + "</ul></div>" : "")
      : '<p class="nw-empty">' + nwEsc(L.empty) + "</p>";
    const tips = await nwTips(context, lang);
    const tipCards = tips.slice(0, 6).map(x => '<a class="nw-card" href="' + x.href + '"><span class="nw-date">' + nwEsc(x.when) + "</span>"
      + '<span class="nw-title">' + nwEsc(x.title) + "</span>" + (x.dek ? '<p class="nw-card-dek">' + nwEsc(x.dek) + "</p>" : "")
      + '<span class="nw-card-go">' + (K ? "읽기" : "Read") + " &rarr;</span></a>").join("");
    back = { href: L.homeHref, label: lang === "ko" ? "&larr; EA 홈" : "&larr; EA Home" };
    main = '<div class="nw-page nw-page-list">'
      + '<span class="nw-eyebrow">' + (K ? "IRS TAX TIP · STUDY TIPS" : "IRS TAX TIPS · STUDY TIPS") + "</span><h1>" + (K ? "IRS Tax Tip · Study Tips" : "IRS Tax Tips · Study Tips") + "</h1>"
      + '<section class="nw-sec" aria-labelledby="nw-sec-news"><div class="nw-sec-head"><h2 id="nw-sec-news">' + (K ? "IRS 주간 Tax Tip" : "IRS Weekly Tax Tips") + "</h2>"
      + '</div><p class="nw-lead">' + nwEsc(L.lead) + "</p>"
      + '<div id="nw-list">' + news + "</div></section>"
      + (tipCards ? '<section class="nw-sec" aria-labelledby="nw-sec-tips"><div class="nw-sec-head"><h2 id="nw-sec-tips">Study Tips</h2></div>'
        + '<p class="nw-lead">' + (K ? "EA 시험 공부에 도움이 되는 글입니다." : "Articles to help you study for the EA exam.") + "</p>"
        + '<div class="nw-grid">' + tipCards + '</div><p class="nw-more"><a href="' + (K ? "/tips/ko/" : "/tips/") + '">' + (K ? "Study Tips 모두 보기" : "All Study Tips") + " &rarr;</a></p></section>" : "")
      + '<div class="nw-cta"><h2>' + nwEsc(L.ctaH) + "</h2><p>" + nwEsc(L.ctaP) + '</p><a class="btn btn-primary btn-lg" href="' + L.ctaHref + '">' + nwEsc(L.ctaB) + "</a></div></div>";
    ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: L.h1, description: desc, inLanguage: lang, url: selfUrl,
      hasPart: mine.slice(0, 20).map(r => ({ "@type": "Article", headline: nwHeadline(r, L).slice(0, 110), url: nwUrl(lang, r.slug), datePublished: r.issue_date })) };
  }
  let out = new HTMLRewriter()
    .on("html", new AttrSetter("lang", lang))
    .on("html", new AttrSetter("class", "lang-" + lang))
    .on("html", new AttrSetter("data-force-lang", lang))
    .on("html", new AttrSetter("data-alt-en", enUrl.replace("https://pracexam.com", "")))
    .on("html", new AttrSetter("data-alt-ko", koUrl.replace("https://pracexam.com", "")))
    .on("title", new TitleRewriter(title))
    .on('meta[name="description"]', new MetaRewriter(desc))
    .on('meta[property="og:type"]', new MetaRewriter(row ? "article" : "website"))
    .on('meta[property="og:title"]', new MetaRewriter(title))
    .on('meta[property="og:description"]', new MetaRewriter(desc))
    .on('meta[property="og:url"]', new MetaRewriter(selfUrl))
    .on('meta[property="og:image"]', new MetaRewriter("https://pracexam.com/og-taxtip-" + lang + ".jpg?v=20261116c"))
    .on('meta[name="twitter:image"]', new MetaRewriter("https://pracexam.com/og-taxtip-" + lang + ".jpg?v=20261116c"))
    .on('meta[property="og:locale"]', new MetaRewriter(L.locale))
    .on('meta[property="og:locale:alternate"]', new MetaRewriter(lang === "ko" ? "en_US" : "ko_KR"))
    .on('meta[name="twitter:title"]', new MetaRewriter(title))
    .on('meta[name="twitter:description"]', new MetaRewriter(desc))
    .on('link[rel="canonical"]', new AttrSetter("href", selfUrl))
    .on('link[rel="alternate"][hreflang="en"]', new AttrSetter("href", enUrl))
    .on('link[rel="alternate"][hreflang="ko"]', new AttrSetter("href", koUrl))
    .on('link[rel="alternate"][hreflang="x-default"]', new AttrSetter("href", (slug && !otherHas) ? selfUrl : enUrl))
    .on('link[rel="alternate"][type="application/rss+xml"]', new AttrSetter("href", nwUrl(lang, "") + "rss.xml"))
    .on("script#nw-ld", { element(el) { el.setInnerContent(JSON.stringify(ld).replace(/</g, "\\u003c"), { html: true }); } })
    .on("#nw-main", { element(el) { el.setInnerContent(main, { html: true }); } })
    .on(".px-backbar", { element(el) { if (back) el.setInnerContent('<a class="px-back" href="' + back.href + '">' + back.label + "</a>"
      + '<a class="px-back px-back-app" href="/app">' + (lang === "ko" ? "내 학습 &rarr;" : "My Practice &rarr;") + "</a>", { html: true }); } });   // boss 2026-11-17
  if (robots) out = out.on("head", { element(el) { el.append('<meta name="robots" content="' + robots + '">', { html: true }); } });
  // a missing other-language issue: drop that hreflang line instead of pointing it at a list page
  if (slug && !otherHas) out = out.on('link[rel="alternate"][hreflang="' + other + '"]', { element(el) { el.remove(); } });
  const res = new Response(out.transform(response).body, response);
  res.headers.delete("Vary");
  return res;
}

// 2026-11-16 (boss): EA landing (/ea/ and /ea/ko/) — the right half of the latest-video band shows the latest IRS weekly news,
// both languages (the landing switches KO/EN in place). Written on the server so crawlers read it. No issues or a read
// error: #nw-land stays hidden and the video takes the band as before.
function nwSnippet(h, max) {
  const m = /IRS TAX TIP[^<]*<\/p>\s*<h2[^>]*>[\s\S]*?<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/i.exec(h || "");
  let t = m ? nwText(m[1]) : "";
  if (t.length > max) t = t.slice(0, max).replace(/\s+\S*$/, "") + "…";
  return t;
}
function nwLandBlock(rows, lang) {
  const L = NW_TXT[lang];
  const mine = rows.filter(r => r.lang === lang);
  if (!mine.length) return "";
  const top = mine[0], titles = nwTitles(top.html);
  const more = titles.slice(1).map(t => ({ d: top.slug, t: t, href: nwPath(lang, top.slug) }))
    .concat(mine.slice(1).map(r => ({ d: r.slug, t: (nwTitles(r.html)[0] || nwHeadline(r, L)), href: nwPath(lang, r.slug) }))).slice(0, 3);
  return '<div class="' + lang + '"><span class="eyebrow">' + (lang === "ko" ? "IRS 주간 Tax Tip" : "IRS Weekly Tax Tips") + "</span>"
    + '<a class="nw-land-main" href="' + nwPath(lang, top.slug) + '"><span class="nw-land-date">' + nwEsc(top.slug) + "</span>"
    + "<h3>" + nwEsc(titles[0] || nwHeadline(top, L)) + "</h3><p>" + nwEsc(nwSnippet(top.html, 170)) + "</p></a>"
    + (more.length ? '<ul class="nw-land-more">' + more.map(x => '<li><span class="d">' + nwEsc(x.d) + '</span><a href="' + x.href + '">' + nwEsc(x.t) + "</a></li>").join("") + "</ul>" : "")
    + '<a class="nw-land-all" href="' + nwPath(lang, "") + '">' + (lang === "ko" ? "IRS Tax Tip 한국어판 모두 보기 &rarr;" : "All IRS Tax Tip summaries &rarr;") + "</a></div>";
}
async function nwLanding(response) {
  const ct = (response && response.headers.get("content-type")) || "";
  if (!ct.includes("text/html") || response.status !== 200) return response;
  const rows = await nwRows();
  if (!rows || !rows.length) return response;
  const ko = nwLandBlock(rows, "ko"), en = nwLandBlock(rows, "en");
  if (!ko && !en) return response;
  // a language with no issue yet falls back to the other language's block
  const html = (ko || en.replace('<div class="en">', '<div class="ko">')) + (en || ko.replace('<div class="ko">', '<div class="en">'));
  return new HTMLRewriter()
    .on("#nw-land", { element(el) { el.removeAttribute("hidden"); el.setInnerContent(html, { html: true }); } })
    .transform(response);
}

// 2026-10-31 (boss): HTML comments are internal work notes; customers and crawlers do not need them.
// Every HTML page leaves the edge without its <!-- ... --> comments. Inline JS/CSS comments are not touched.
export async function onRequest(context) {
  const _p = new URL(context.request.url).pathname;
  if (KO_REDIRECT[_p]) return Response.redirect(new URL(KO_REDIRECT[_p], context.request.url).toString(), 301);
  if (_p === "/ea/irs-news" || _p === "/ea/irs-news/ko") return Response.redirect(new URL(_p + "/", context.request.url).toString(), 301);
  const _nw = _p.startsWith("/ea/irs-news/");
  let response = _nw ? await irsNews(context, _p) : KO_ROUTES[_p] ? await koRoute(context, KO_ROUTES[_p]) : await handle(context);
  if (_p === "/ea/reviews/" || _p === "/ea/reviews/ko/") response = await injectReviews(response, _p === "/ea/reviews/ko/");
  if (_p === "/ea/" || _p === "/ea/ko/" || _p === "/ea/index.html") response = await nwLanding(response);
  const ct = (response && response.headers.get("content-type")) || "";
  if (!ct.includes("text/html")) return response;
  const _h = new URL(context.request.url).hostname;
  const _test = _h === "test.pracexam.com" || _h.endsWith(".pages.dev");   // test site keeps the links (sample reviews show there)
  if (!_test && RV_LINK_PAGES.test(_p)) response = await hideReviewLinks(response);
  return new HTMLRewriter().onDocument({ comments(c) { c.remove(); } }).transform(response);
}
